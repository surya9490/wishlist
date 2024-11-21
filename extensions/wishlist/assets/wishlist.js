class GuestWishlist {
  constructor(shop) {
    this.shop = shop;
    this.wishlistData = this.fetchWishlist();
  }

  fetchWishlist() {
    return JSON.parse(sessionStorage.getItem("wishlistGuest")) || [];
  }

  saveWishlist() {
    sessionStorage.setItem("wishlistGuest", JSON.stringify(this.wishlistData));
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
    sessionStorage.removeItem("wishlistGuest");
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
      const response = await fetch(
        `${this.appUrl}/api/wishlist?customer=${this.customerId}&shop=${this.shop}`
      );
      if (!response.ok) throw new Error("Failed to fetch wishlist data.");

      const result = await response.json();
      this.wishlistData = result.data || [];
      this.variantData = result.variantData || [];
      return { wishlistData: this.wishlistData, variantData: this.variantData };
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
    debugger
    try {
      const formData = new FormData();
      formData.append("customerId", this.customerId);
      formData.append("shop", this.shop);
      formData.append("productVariantId", productVariantId);
      formData.append("_action", action);

      if (productHandle) formData.append("productHandle", productHandle);

      const response = await fetch(`${this.appUrl}/api/wishlist`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Failed to ${action} item in wishlist.`);

      const result = await response.json();
      const { data, variantData } = result;
      if (action === "add") {
        this.wishlistData.push({ ...data });
      } else {
        this.wishlistData = this.wishlistData.filter(
          item => item.productVariantId !== productVariantId
        );
      }
      const message = action === "add" ? "Product added to wishlist." : "Product removed from wishlist.";
      return { success: true, message, variantData };
    } catch (error) {
      console.error(`Error ${action}ing item in wishlist:`, error);
      return { success: false, message: `Error ${action}ing item in wishlist.` };
    }
  }
}

class WishlistUI {
  constructor(wishlistManager) {
    this.wishlistData = [];
    this.wishlistManager = wishlistManager
    this.selectors = {
      dialog: "[wishlist-dialog]",
      close: "[wishlist-close]",
      icon: "[wishlist-header-icon]",
      search: "[wishlist-dialog] [type='search']",
      remove: "[remove-variant]",
    };
    this.dialog = document.querySelector(this.selectors.dialog);
    this.init();
  }

  init() {
    const popupTriggerIcon = document.querySelector(this.selectors.icon);
    const closeButton = this.dialog.querySelector(this.selectors.close);
    const search = this.dialog.querySelector(this.selectors.search);

    popupTriggerIcon?.addEventListener("click", () => this.showDialog());
    closeButton?.addEventListener("click", () => this.closeDialog());

    // Apply throttling to the searchWishlist function
    const debouncedSearch = this.wishlistManager.debounce((event) => {
      this.searchWishlist(event.target.value);
    }, 300);

    search?.addEventListener("input", debouncedSearch);
    this.dialog.addEventListener("close", () => this.closeDialog());
  }


  setVariantData(data) {
    this.variantData = data;
    this.renderProductCards(data); // Initial render with all products
  }

  updateProductCardsOnAction(data, action) {
    this.updateProductCards(data, action);

  }

  showDialog() {
    if (this.dialog) this.dialog.showModal();
  }

  closeDialog() {
    this.dialog.close();
  }

  renderProductCards(data) {
    const productContainer = this.dialog.querySelector(".product-container");

    if (!productContainer) {
      console.error("Product container not found.");
      return;
    }

    productContainer.innerHTML = ""; // Clear existing cards
    data.forEach((item) => {
      const card = this.createProductCard(item);
      productContainer.appendChild(card);
      card.querySelector(this.selectors.remove).addEventListener("click", () => this.removeItem(card.getAttribute("data-variant-id")));
    });
  }

  removeItem(variantId) {
    debugger
    const filteredData = this.variantData.filter((item) => item.id !== variantId);
    this.variantData = [...filteredData]
    let action = 'remove'
    this.updateProductCardsOnAction(filteredData, action);
    const id = variantId.split('/').pop();
    this.wishlistManager.onActionRemoveItemFromPopup(id,'',action)
  }

  createProductCard(item) {
    const imageUrl =
      item?.image?.url ||
      item?.product?.featuredMedia?.preview?.image?.url ||
      "placeholder.jpg";
    const title = item?.product?.title || "Product Name";

    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("data-variant-id", item.id);

    card.innerHTML = `
      <span remove-variant>X</span>
      <a href="/products/${item?.product?.handle}">
        <div class="product-image">
          <img src="${imageUrl}" alt="${title}" />
        </div>
      </a>
      <div class="product-details">
        <h3 title="${title}">${title}</h3>
        <p>${item.title}</p>
      </div>
    `;

    return card;
  }

  searchWishlist(query) {
    const lowerCaseQuery = query.trim().toLowerCase();

    // Filter wishlist data by title
    const filteredData = query === '' ? this.variantData : this.variantData.filter((item) => {
      const title = item?.product.title || "";
      return title.toLowerCase().includes(lowerCaseQuery);
    })

    // Update DOM selectively
    this.updateProductCards(filteredData);
  }

  updateProductCards(filteredData, action) {
    const productContainer = this.dialog.querySelector(".product-container");

    if (!productContainer) {
      console.error("Product container not found.");
      return;
    }

    const existingCards = Array.from(productContainer.children);

    // Create a map for efficient lookup
    const filteredMap = filteredData.length > 0 ? new Map() : new Map(
      filteredData.map((item) => [item.id, item])
    );

    // Update or remove existing cards
    existingCards.forEach((card) => {
      const variantId = card.getAttribute("data-variant-id");

      if (filteredMap.has(variantId)) {
        filteredMap.delete(variantId); // Mark as processed
      } else {
        // Remove card if not in filtered data
        card.remove();
      }
    });

    if (action === 'remove' && this.dialog?.querySelector(this.selectors.search)?.value !== '') return;

    // Add new cards for remaining filtered items
    filteredMap.forEach((item) => {
      const newCard = this.createProductCard(item);
      productContainer.appendChild(newCard);
      newCard.querySelector(this.selectors.remove).addEventListener("click", () => this.removeItem(newCard.getAttribute("data-variant-id")));
    });
  }
}


class WishlistManager {
  // Private class properties
  #appUrl = "https://mart-shot-lesser-timer.trycloudflare.com";
  #customerId = window.wishlistData?.customerEmail || null;
  #shop = window.wishlistData?.shop || null;
  #guestWishlist = new GuestWishlist(this.#shop);
  #wishlistUI = new WishlistUI(this);
  #loggedInWishlist = this.#customerId
    ? new LoggedInWishlist(this.#appUrl, this.#customerId, this.#shop)
    : null;
  #toasterConfig;
  #selectors;
  #options;
  #timer;

  // Constructor with default configurations
  constructor(config = {}) {
    this.#toasterConfig = config.toasterConfig || WishlistManager.defaultToasterConfig;
    this.#selectors = config.selectors || WishlistManager.defaultSelectors;
    this.#options = { ...WishlistManager.options, ...config.options };
  }

  // Static properties for reusable defaults
  static options = {
    toaster: true,
    guestWishList: true,
    variantChange: true,
  };

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

  // Utility function for debouncing
  debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  //dispatch custom event
  #triggerEvent(action, product) {
    console.log(action, product);
    const event = new CustomEvent("wishlist:update", {
      detail: { action, product },
    });
    document.dispatchEvent(event);
  }

  // Initialize the WishlistManager
  async init() {
    if (this.#loggedInWishlist) {
      await this.#syncGuestDataWithDB();
    } else {
      this.#updateUI(this.#wishlistUI.setVariantData(this.#guestWishlist.fetchWishlist()));
    }
    this.#initWishlistButtons();
    this.#handleVariantChange();
  }

  // Sync guest wishlist with the logged-in user's wishlist
  async #syncGuestDataWithDB() {
    try {
      const data = await this.#loggedInWishlist?.fetchWishlist();
      const guestData = this.#guestWishlist.fetchWishlist();

      if (!guestData.length || !this.#customerId) {
        this.#wishlistUI.setVariantData(data.variantData);
        this.#updateUI();
        return;
      }

      const newWishlistItems = guestData.filter(
        (guestItem) =>
          !data.wishlistData.some(
            (dbItem) =>
              dbItem.productVariantId === guestItem.productVariantId &&
              dbItem.shop === guestItem.shop
          )
      );

      if (newWishlistItems.length > 0) {
        await this.#bulkUpdateWishlist(newWishlistItems);
        this.#guestWishlist.clearWishlist();
        this.#updateUI();
      }
    } catch (error) {
      this.handleError(error);
      this.#showToaster("error", this.#toasterConfig.messages.error);
    }
  }

  async #bulkUpdateWishlist(newItems) {
    const formData = new FormData();
    formData.append("customerId", this.#customerId);
    formData.append("shop", this.#shop);
    formData.append("data", JSON.stringify(newItems));
    formData.append("_action", "bulkCreate");

    const response = await fetch(`${this.#appUrl}/api/wishlist`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to bulk update wishlist");
    }
  }

  // Initialize wishlist buttons
  #initWishlistButtons() {
    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (!this.#options.guestWishList) {
          this.#redirectToLogin();
          return;
        }
        const productId = button.getAttribute("data-product-id");
        const productHandle = button.getAttribute("data-product-handle");
        const isInWishlist = this.#isProductInWishlist(productId);

        this.#debounceWishlistAction(productId, productHandle, isInWishlist);
      });
    });
  }

  // Check if a product is already in the wishlist
  #isProductInWishlist(productId) {
    return this.#getWishlistHandler()?.wishlistData?.some(
      (item) => item.productVariantId === productId
    );
  }

  // Debounce wishlist action for better performance
  #debounceWishlistAction = this.debounce((productVariantId, productHandle, isInWishlist) => {
    this.#handleWishlistAction(productVariantId, productHandle, isInWishlist);
  }, 300);

  // Handle adding or removing items from the wishlist
  async #handleWishlistAction(productVariantId, productHandle, isInWishlist) {
    const handler = this.#getWishlistHandler();
    const action = isInWishlist ? "remove" : "add";

    try {
      const result = await handler[action === "add" ? "addItem" : "removeItem"](
        productVariantId,
        productHandle
      );

      if (result.success) {
        this.#updateWishlistUI(action, productVariantId, result.variantData);
        this.#triggerEvent(`wishlist:${action}ed`, { productVariantId, productHandle });
        this.#showToaster(action, result.message);
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.#updateUI();
    }
  }

  onActionRemoveItemFromPopup(productVariantId, productHandle,boolean) {
    this.#handleWishlistAction(productVariantId, productHandle, boolean);
  }


  // Update wishlist UI based on action
  #updateWishlistUI(action, productVariantId, variantData) {
    if (action === "add") {
      this.#wishlistUI.updateProductCardsOnAction(
        [...this.#wishlistUI.variantData, variantData],
        "",
        productVariantId
      );
    } else {
      const updatedData = this.#wishlistUI.variantData.filter((item) => {
        const variantId = item.id?.split("/")?.pop() || productVariantId
        return variantId !== productVariantId.toString();
      });
      this.#wishlistUI.updateProductCards(updatedData);
    }
  }

  // Show toaster notifications
  #showToaster(status, message) {
    if (!this.#options.toaster) return;
    const toaster = document.querySelector(this.#selectors.toaster);
    if (!toaster) return;
    clearTimeout(this.#timer);
    document.querySelector(this.#selectors.toasterMessage).textContent = message;
    toaster.style.transform = "translateX(0)";
    this.#timer = setTimeout(() => {
      toaster.style.transform = "translateX(-100%)";
    }, this.#toasterConfig.timer);
  }

  // Handle variant changes in the wishlist
  #handleVariantChange() {
    if (!this.#options.variantChange) return;
    document.addEventListener("change", (event) => {
      const section = event.target.closest("section");
      const form = section?.querySelector("form[action*='/cart/add']");
      if (!form) return;

      const variantId = form.querySelector('[name="id"]').value;
      const wishlistIcon = section.querySelector(this.#selectors.wishlistIcon);
      if (wishlistIcon && variantId) wishlistIcon.setAttribute("data-product-id", variantId);

      this.#updateUI();
      this.#triggerEvent("wishlist:variantChange", { variantId });
    });
  }

  // Get the current wishlist handler (logged-in or guest)
  #getWishlistHandler() {
    return this.#loggedInWishlist || this.#guestWishlist;
  }

  // Update UI state for all wishlist icons
  #updateUI() {
    const wishlistData = this.#getWishlistHandler()?.wishlistData;
    const useVariantId = this.#options.variantChange;

    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      const productId = button.getAttribute(useVariantId ? "data-product-id" : "data-product-handle");
      const isWishlisted = wishlistData.some((item) =>
        useVariantId ? item.productVariantId === productId : item.productHandle === productId
      );
      button.toggleAttribute("wishlisted", isWishlisted);
    });
  }

  // Redirect to login page
  #redirectToLogin() {
    window.location.href = "/account/login";
  }

  // General error handling
  handleError(error) {
    console.error("API Error: ", error);
  }
}

// Initialize WishlistManager
document.addEventListener("DOMContentLoaded", () => {
  const config = {
    options: {
      toaster: true,
      variantChange: true,
      guestWishList: true,
    },
  };
  const wishlistManager = new WishlistManager(config);
  wishlistManager.init();
});

