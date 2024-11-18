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

      return { success: true, message: `Product ${action}ed in wishlist.` };
    } catch (error) {
      console.error(`Error ${action}ing item in wishlist:`, error);
      return { success: false, message: `Error ${action}ing item in wishlist.` };
    }
  }
}

class WishlistManager {
  constructor(config = {}) {
    this.appUrl = 'https://codeinspire-wishlist.myshopify.com/apps/connect';
    this.customerId = window.wishlistData?.customerEmail || null;
    this.shop = window.wishlistData?.shop || null;

    this.guestWishlist = new GuestWishlist(this.shop);
    this.loggedInWishlist = this.customerId ? new LoggedInWishlist(this.appUrl, this.customerId, this.shop) : null;

    this.toasterConfig = config.toasterConfig || WishlistManager.defaultToasterConfig;
    this.selectors = config.selectors || WishlistManager.defaultSelectors;
    this.timer = null;
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

  debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), timeout);
    };
  }

  handleWishListActionDebounce = this.debounce((productId, productHandle, isInWishlist) => {
    this.handleWishlistAction(productId, productHandle, isInWishlist);
  })

  async init() {
    if (this.loggedInWishlist) await this.syncGuestDataWithDB();
    else this.updateUI(this.guestWishlist.fetchWishlist());

    this.initWishlistButtons();
    this.onVariantChange();
  }

  async syncGuestDataWithDB() {
    try {
      debugger
      // Fetch logged-in user's wishlist
      const data = await this.loggedInWishlist?.fetchWishlist();

      // Fetch guest wishlist from session storage
      const guestData = this.guestWishlist.fetchWishlist();

      // If there's no guest data or no logged-in user, skip syncing
      if (!guestData.length || !this.customerId) {
        this.updateUI();
        return;
      }

      // Merge guest data and logged-in data (keep logged-in data intact)
      this.wishlistData = [...data, ...guestData];
      this.updateUI();

      // Filter guest data to exclude items already in the DB
      const newWishlistItems = guestData.filter((guestItem) => {
        return !data.some(
          (dbItem) =>
            dbItem.productVariantId === guestItem.productVariantId &&
            dbItem.shop === guestItem.shop
        );
      });

      // If there are new items to sync, prepare bulk update
      if (newWishlistItems.length > 0) {
        const formData = new FormData();
        formData.append("customerId", this.customerId);
        formData.append("shop", this.shop);
        formData.append("data", JSON.stringify(newWishlistItems));
        formData.append("_action", "bulkCreate");

        const response = await fetch(`${this.appUrl}/api/wishlist`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to bulk update wishlist");
        }

        // Clear guest data after successful sync
        this.guestWishlist.clearWishlist();
        console.log("Guest wishlist synced successfully.");
        this.updateUI();
      }
    } catch (error) {
      console.error("Error syncing guest wishlist data:", error);
      this.handleToaster("error", "Failed to sync guest wishlist.");
    }
  }


  initWishlistButtons() {
    document.querySelectorAll(this.selectors.wishlistIcon).forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        const productId = button.getAttribute("data-product-id");
        const productHandle = button.getAttribute("data-product-handle");
        const isInWishlist = !!this.getWishlistHandler()?.wishlistData?.some(
          item => item.productVariantId === productId
        );
        this.handleWishListActionDebounce(productId, productHandle, isInWishlist);
      });
    });
  }

  async handleWishlistAction(productVariantId, productHandle, isInWishlist) {
    const handler = this.getWishlistHandler();
    const action = isInWishlist ? "remove" : "add";

    const result = await (action === "add"
      ? handler.addItem(productVariantId, productHandle)
      : handler.removeItem(productVariantId));

    this.showToaster(action, result.message);
    this.updateUI();
  }

  showToaster(status, message) {
    const toaster = document.querySelector(this.selectors.toaster);
    if (!toaster) return;
    clearTimeout(this.timer)
    document.querySelector(this.selectors.toasterMessage).textContent = message;
    toaster.style.transform = "translateX(0)";
    this.timer = setTimeout(() => {
      toaster.style.transform = "translateX(-100%)";
    }, this.toasterConfig.timer);
  }

  getWishlistHandler() {
    return this.loggedInWishlist || this.guestWishlist;
  }

  updateUI() {
    const wishlistData = this.getWishlistHandler().wishlistData;
    document.querySelectorAll(this.selectors.wishlistIcon).forEach(button => {
      const productId = button.getAttribute("data-product-id");
      const isInWishlist = wishlistData.some(item => item.productVariantId === productId);
      button.toggleAttribute("wishlisted", isInWishlist);
    });
  }

  onVariantChange() {
    document.addEventListener('change', event => {
      const form = event.target.closest('form[action*="/cart/add"]');
      if (!form) return;

      const variantId = form.querySelector('input[name="id"]')?.value;
      if (!variantId) return;

      const wishlistIcon = form.querySelector(this.selectors.wishlistIcon);
      if (wishlistIcon) wishlistIcon.setAttribute('data-product-id', variantId);
    });
  }
}

// Initialize the WishlistManager
document.addEventListener("DOMContentLoaded", () => {
  const wishlistManager = new WishlistManager();
  wishlistManager.init();
});
