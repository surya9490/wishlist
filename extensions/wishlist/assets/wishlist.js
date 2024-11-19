class GuestWishlist {
  constructor(shop) {
    this.shop = shop;
    this.wishlistData = this.fetchWishlist();
  }

  fetchWishlist() {
    return JSON.parse(sessionStorage.getItem('wishlistGuest')) || [];
  }

  saveWishlist() {
    sessionStorage.setItem('wishlistGuest', JSON.stringify(this.wishlistData));
  }

  addItem(productVariantId, productHandle) {
    if (!this.wishlistData.some(item => item.productVariantId === productVariantId)) {
      this.wishlistData.push({ productVariantId, productHandle, shop: this.shop });
      this.saveWishlist();
      return { success: true, message: "Product added to guest wishlist." };
    }
    return { success: false, message: "Product is already in the wishlist." };
  }

  removeItem(productVariantId) {
    const initialLength = this.wishlistData.length;
    this.wishlistData = this.wishlistData.filter(item => item.productVariantId !== productVariantId);
    if (this.wishlistData.length !== initialLength) {
      this.saveWishlist();
      return { success: true, message: "Product removed from guest wishlist." };
    }
    return { success: false, message: "Product not found in the wishlist." };
  }

  clearWishlist() {
    sessionStorage.removeItem('wishlistGuest');
    this.wishlistData = [];
  }
}

class LoggedInWishlist {
  constructor(appUrl, customerId, shop) {
    this.appUrl = appUrl;
    this.customerId = customerId;
    this.shop = shop;
    this.wishlistData = [];
  }

  async fetchWishlist() {
    try {
      const response = await fetch(`${this.appUrl}/api/wishlist?customer=${this.customerId}&shop=${this.shop}`);
      if (!response.ok) throw new Error("Failed to fetch wishlist data.");

      const result = await response.json();
      this.wishlistData = result.data || [];
      return this.wishlistData;
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      return [];
    }
  }

  async addItem(productVariantId, productHandle) {
    return this._sendWishlistUpdate("add", { productVariantId, productHandle });
  }

  async removeItem(productVariantId) {
    return this._sendWishlistUpdate("remove", { productVariantId });
  }

  async _sendWishlistUpdate(action, { productVariantId, productHandle = null }) {
    try {
      const formData = new FormData();
      formData.append("customerId", this.customerId);
      formData.append("shop", this.shop);
      formData.append("productVariantId", productVariantId);
      formData.append("_action", action);

      if (productHandle) formData.append("productHandle", productHandle);

      const response = await fetch(`${this.appUrl}/api/wishlist`, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Failed to ${action} item in wishlist.`);

      if (action === "add") this.wishlistData.push({ productVariantId, productHandle, shop: this.shop });
      else this.wishlistData = this.wishlistData.filter(item => item.productVariantId !== productVariantId);

      const message = action === "add" ? "Product added to wishlist." : "Product removed from wishlist.";
      return { success: true, message };
    } catch (error) {
      console.error(`Error ${action}ing item in wishlist:`, error);
      return { success: false, message: `Error ${action}ing item in wishlist.` };
    }
  }
}

class WishlistManager {
  #appUrl = "https://rocks-an-florida-partners.trycloudflare.com";
  #customerId = window.wishlistData?.customerEmail || null;
  #shop = window.wishlistData?.shop || null;
  #guestWishlist = new GuestWishlist(this.#shop);
  #loggedInWishlist = this.#customerId
    ? new LoggedInWishlist(this.#appUrl, this.#customerId, this.#shop)
    : null;
  #toasterConfig;
  #selectors;
  #timer;

  constructor(config = {}) {
    this.#toasterConfig = config.toasterConfig || WishlistManager.defaultToasterConfig;
    this.#selectors = config.selectors || WishlistManager.defaultSelectors;
  }

  static defaultSelectors = {
    toaster: "[wishlist-toaster]",
    toasterMessage: "[wishlist-toaster] [wishlist-message]",
    wishlistIcon: ".wishlist-icon",
    variantChange: "fieldset input[type='checkbox'], fieldset input[type='radio']",
  };

  static defaultToasterConfig = {
    timer: 5000,
    messages: {
      add: "Product added to wishlist",
      remove: "Product removed from wishlist",
      error: "Failed to update wishlist",
    },
  };

  async init() {
    if (this.#loggedInWishlist) await this.#syncGuestDataWithDB();
    else this.#updateUI(this.#guestWishlist.fetchWishlist());

    this.#initWishlistButtons();
    this.#onVariantChange();
  }

  #triggerEvent(action, product) {
    const event = new CustomEvent("wishlistUpdated", {
      detail: { action, product },
    });
    document.dispatchEvent(event);
  }

  async #syncGuestDataWithDB() {
    try {
      const data = await this.#loggedInWishlist?.fetchWishlist();
      const guestData = this.#guestWishlist.fetchWishlist();

      if (!guestData.length || !this.#customerId) {
        this.#updateUI();
        return;
      }

      this.wishlistData = [...data, ...guestData];
      this.#updateUI();

      const newWishlistItems = guestData.filter((guestItem) => {
        return !data.some(
          (dbItem) =>
            dbItem.productVariantId === guestItem.productVariantId &&
            dbItem.shop === guestItem.shop
        );
      });

      if (newWishlistItems.length > 0) {
        const formData = new FormData();
        formData.append("customerId", this.#customerId);
        formData.append("shop", this.#shop);
        formData.append("data", JSON.stringify(newWishlistItems));
        formData.append("_action", "bulkCreate");

        const response = await fetch(`${this.#appUrl}/api/wishlist`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to bulk update wishlist");
        }

        this.#guestWishlist.clearWishlist();
        this.#updateUI();
      }
    } catch (error) {
      console.error("Error syncing guest wishlist data:", error);
      this.#showToaster("error", "Failed to sync guest wishlist.");
    }
  }

  #initWishlistButtons() {
    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const productId = button.getAttribute("data-product-id");
        const productHandle = button.getAttribute("data-product-handle");
        const isInWishlist = !!this.#getWishlistHandler()?.wishlistData?.some(
          (item) => item.productVariantId === productId
        );
        this.#handleWishlistAction(productId, productHandle, isInWishlist);
      });
    });
  }

  async #handleWishlistAction(productVariantId, productHandle, isInWishlist) {
    const handler = this.#getWishlistHandler();
    const action = isInWishlist ? "remove" : "add";

    const result = await (action === "add"
      ? handler.addItem(productVariantId, productHandle)
      : handler.removeItem(productVariantId));

    const wishlistAction = action === "add" ? "wishlist:added" : "wishlist:removed";
    this.#triggerEvent(wishlistAction, { productVariantId, productHandle });
    this.#showToaster(action, result.message);
    this.#updateUI();
  }

  #showToaster(status, message) {
    const toaster = document.querySelector(this.#selectors.toaster);
    if (!toaster) return;
    clearTimeout(this.#timer);
    document.querySelector(this.#selectors.toasterMessage).textContent = message;
    toaster.style.transform = "translateX(0)";
    this.#timer = setTimeout(() => {
      toaster.style.transform = "translateX(-100%)";
    }, this.#toasterConfig.timer);
  }

  #getWishlistHandler() {
    return this.#loggedInWishlist || this.#guestWishlist;
  }

  #updateUI() {
    const wishlistData = this.#getWishlistHandler().wishlistData;
    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      const productId = button.getAttribute("data-product-id");
      const isInWishlist = wishlistData.some((item) => item.productVariantId === productId);
      button.toggleAttribute("wishlisted", isInWishlist);
    });
  }

  #onVariantChange() {
    document.addEventListener("change", (event) => {
      debugger
      const section =  event.target.closest('section')
      const form = section.querySelector('form[action*="/cart/add"]');
      if (!form) return;

      const variant = event.target.matches(this.#selectors.variantChange) || section.querySelector(this.#selectors.variantChange);
      if (!variant) return;

      const wishlistIcon = section.querySelector(this.#selectors.wishlistIcon);
      const productHandle = wishlistIcon.getAttribute("data-product-handle");
      const variantId = form.querySelector('[name="id"]').value;
      if (wishlistIcon && variantId) wishlistIcon.setAttribute("data-product-id", variantId);
      else return;
      this.#updateUI();
      this.#triggerEvent('wishlist:variantChange', { variantId, productHandle });
    });
  }
}

// Initialize the WishlistManager
document.addEventListener("DOMContentLoaded", () => {
  const wishlistManager = new WishlistManager();
  wishlistManager.init();
});
