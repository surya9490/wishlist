class PubSub {
  constructor() {
    this.events = {};
  }
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  unsubscribe(event, callback) {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  publish(event, data) {
    if (!this.events[event]) return;

    this.events[event].forEach((callback) => callback(data));
  }
}

const pubsub = new PubSub();

class WishlistUI {
  constructor(wishlistManager, url, shop, customerId) {
    this.wishlistData = { wishlisted: [], variantData: [] };
    this.wishlistManager = wishlistManager
    this.shop = shop;
    this.customerId = customerId;
    this.appUrl = url
    this.selectors = {
      dialog: "[wishlist-dialog]",
      close: "[wishlist-close]",
      icon: "[wishlist-header-icon]",
      remove: "[remove-variant]",
      productContainer: ".product-container",
      search: "[type='search']",
    };
    this.dialog = document.querySelector(this.selectors.dialog);
    this.init();
  }

  init() {
    const popupTriggerIcon = document.querySelector(this.selectors.icon);
    const closeButton = this.dialog?.querySelector(this.selectors.close);
    const search = this.dialog.querySelector(this.selectors.search);

    popupTriggerIcon?.addEventListener("click", () => this.showDialog());
    closeButton?.addEventListener("click", () => this.closeDialog());
    this.dialog?.addEventListener("close", () => this.closeDialog());

    search?.addEventListener("input", (event) => this.handleSeach(event.target.value));

  }

  async handleSeach(query) {
    const formData = new FormData();
    formData.append("action", "search");
    formData.append("shop", this.shop);
    formData.append("query", query);
    formData.append("customerId", this.customerId);
    const response = await fetch(`${this.appUrl}/api/wishlist`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to fetch wishlist data.");
    const data = await response.json();
    this.setVariantData(data);
  }

  setVariantData(data) {
    this.wishlistData.variantData = data;
    this.renderProductCards(data); // Render all products initially
  }

  showDialog() {
    if (this.dialog) this.dialog.showModal();
  }

  closeDialog() {
    this.dialog?.close();
  }

  renderProductCards(data) {
    const productContainer = this.getProductContainer();

    if (!productContainer) {
      console.error("Product container not found.");
      return;
    }

    productContainer.innerHTML = ""; // Clear existing content
    const cards = data.map((item) => this.createProductCard(item));
    productContainer.append(...cards); // Append all cards at once
  }

  getProductContainer() {
    // Get or create the product container
    let productContainer = this.dialog?.querySelector(this.selectors.productContainer);
    if (!productContainer) {
      productContainer = document.createElement("div");
      productContainer.className = "product-container";
      this.dialog.appendChild(productContainer);
    }
    return productContainer;
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
      <span ${this.selectors.remove.substring(1)}>X</span>
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

    // Attach remove functionality
    card.querySelector(this.selectors.remove).addEventListener("click", () =>
      this.removeProduct(item.id)
    );

    return card;
  }

  removeProduct(variantId) {
    this.wishlistData.variantData = this.wishlistData.variantData.filter(
      (item) => item.id !== variantId
    );
    this.renderProductCards(this.wishlistData.variantData);
  }
}



class WishlistApi {
  constructor(wishlistManager, appUrl, shop, customerId, wishlistData) {
    this.wishlistManager = wishlistManager;
    this.appUrl = appUrl;
    this.shop = shop;
    this.customerId = customerId;
    this.wishlistData = wishlistData;
    this.initialized = false; // Track initialization state

  }

  async init() {
    await this.loadWishListData();
    pubsub.subscribe('wishlist:action', (data) => this.handleWishlistAction(data))
  }

  async loadWishListData() {
    try {
      const data = await this.getWishlistedData();
      const syncedData = await this.syncUserDataWithGuest(data);
      this.wishlistManager.handleUpdatedData({ data: syncedData, action: "load" });
      this.initialized = true; // Mark as initialized
    } catch (error) {
      this.handleError(error);
    }
  }

  async getWishlistedData() {
    return this.customerId ? this.fetchWishlistedData() : this.fetchGuestUserData();
  }

  async fetchWishlistedData() {
    try {
      const response = await fetch(`${this.appUrl}/api/wishlist?customer=${this.customerId}&shop=${this.shop}`);
      if (!response.ok) throw new Error("Failed to fetch wishlist data.");
      return await response.json();
    } catch (error) {
      this.handleError(error);
      return { wishlisted: [], variantData: [] }; // Fallback data
    }
  }

  fetchGuestUserData() {
    return this.getGuestData();
  }

  getGuestData() {
    return JSON.parse(sessionStorage.getItem("wishlistGuest")) || { wishlisted: [], variantData: [] };
  }

  setGuestData(data) {
    sessionStorage.setItem("wishlistGuest", JSON.stringify(data));
  }

  async syncUserDataWithGuest(data) {
    debugger
    if (!this.customerId) return data;
    const guestUserData = this.getGuestData();
    if (guestUserData.wishlisted.length === 0) return data;
    const newWishlistItems = guestUserData.wishlisted.filter(
      (guestItem) =>
        !data.wishlisted.some(
          (dbItem) => dbItem.productVariantId === guestItem.productVariantId && dbItem.shop === guestItem.shop
        )
    );

    if (newWishlistItems?.length === 0) return data;
    const variantData = newWishlistItems.map((item) => item.productVariantId);
    if (!Array.isArray(variantData) || variantData.length === 0) {
      throw new Error("variantData must be a non-empty array");
    }
    const response = await this.handleRequest({ action: "bulkCreate", variantData: JSON.stringify(variantData) });
    data.variantData = [...data.variantData, ...response.variantData];
    data.wishlisted = [...data.wishlisted, ...newWishlistItems];
    this.setGuestData({ wishlisted: [], variantData: [] });
    return data;
  }

  async handleWishlistAction({ action, productVariantId, ...params }) {
    debugger
    try {
      if (!this.customerId && action === "remove") {
        this.updateWishlistData(action, productVariantId, params.productHandle, { wishlisted: [], variantData: [] });
        return
      }
      const response = await this.handleRequest({ action, productVariantId, ...params });
      this.updateWishlistData(action, productVariantId, params.productHandle, response);
    } catch (error) {
      this.handleError(error);
    }
  }

  updateWishlistData(action, productVariantId, productHandle, response) {
    let { wishlisted = [], variantData = [] } = this.wishlistData;
    switch (action) {
      case "add":
      case "fetch":
        wishlisted = [...wishlisted, ...(response.wishlisted || [])];
        variantData = [...variantData, ...(response.variantData || [])];
        if (action === "fetch") {
          wishlisted.push({ productVariantId, productHandle, shop: this.shop });
        }
        break;
      case "remove":
        wishlisted = wishlisted.filter((item) => item.productVariantId !== productVariantId);
        variantData = variantData.filter((item) => item.id !== productVariantId);
        break;
      default:
        console.warn("Unknown action:", action);
        break;
    }
    const updatedData = { wishlisted, variantData };
    if (!this.customerId) {
      this.setGuestData(updatedData);
    }

    pubsub.publish("wishlist:updated", { data: updatedData, action });

  }

  async handleRequest(params) {
    try {
      const formData = new FormData();
      Object.entries(params).forEach(([key, value]) => formData.append(key, value));
      formData.append("shop", this.shop);
      if (this.customerId) formData.append("customerId", this.customerId);

      const response = await fetch(`${this.appUrl}/api/wishlist`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Failed to ${params.action} item in wishlist.`);
      return await response.json();
    } catch (error) {
      this.handleError(error);
      throw error; // Rethrow for caller's error handling.
    }
  }

  handleError(error) {
    console.error("Wishlist API Error:", error.message);
  }
}

class WishlistManager {
  #appUrl = "https://courier-compiled-postposted-worldwide.trycloudflare.com";
  #customerId = window.wishlistData?.customerEmail || null;
  #shop = window.wishlistData?.shop || null;
  wishlistData = { wishlisted: [], variantData: [] };
  wishlistApi = new WishlistApi(this, this.#appUrl, this.#shop, this.#customerId, this.wishlistData);
  wishlistUi = new WishlistUI(this, this.#appUrl, this.#shop, this.#customerId);
  #toasterConfig;
  #selectors;
  #options;
  #timer;

  constructor(config = {}) {
    this.#toasterConfig = config.toasterConfig || WishlistManager.defaultToasterConfig;
    this.#selectors = config.selectors || WishlistManager.defaultSelectors;
    this.#options = { ...WishlistManager.options, ...config.options };
  }

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
      fetch: "Product add to wishlist",
      error: "Failed to update wishlist",
    },
  };

  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  #triggerEvent(action, product) {
    const event = new CustomEvent("wishlist:update", {
      detail: { action, product },
    });
    document.dispatchEvent(event);
  }

  init() {
    this.#initWishlistButtons();
    pubsub.subscribe('wishlist:updated', (params) => this.handleUpdatedData(params))
  }

  #initWishlistButtons() {
    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (!this.#options.guestWishList) {
          this.#redirectToLogin();
          return;
        }

        const productVariantId = button.getAttribute("data-product-id");
        const productHandle = button.getAttribute("data-product-handle");
        const isInWishlist = this.#isProductInWishlist(productVariantId);

        const action = isInWishlist ? "remove" : this.#customerId ? "add" : "fetch";

        this.#debounceWishlistAction({ productHandle, productVariantId, action });
      });
    });
  }

  handleUpdatedData({ data, action }) {
    this.wishlistData = data;
    this.#updateUI();
    this.#showToaster(action);
  }

  #updateUI() {
    const useVariantId = this.#options.variantChange;

    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      const productId = button.getAttribute(
        useVariantId ? "data-product-id" : "data-product-handle"
      );
      const isWishlisted = this.wishlistData.wishlisted.some((item) =>
        useVariantId
          ? item.productVariantId === productId
          : item.productHandle === productId
      );
      button.toggleAttribute("wishlisted", isWishlisted);
    });
  }

  #debounceWishlistAction = this.debounce((params) => {
    pubsub.publish('wishlist:action', params)
  }, 300);

  #showToaster(status) {
    if (!this.#options.toaster) return;
    const toaster = document.querySelector(this.#selectors.toaster);
    if (!toaster) return;
    clearTimeout(this.#timer);
    document.querySelector(this.#selectors.toasterMessage).textContent =
      this.#toasterConfig.messages[status] || "Wishlist updated";
    toaster.style.transform = "translateX(0)";
    this.#timer = setTimeout(() => {
      toaster.style.transform = "translateX(-100%)";
    }, this.#toasterConfig.timer);
  }

  #redirectToLogin() {
    window.location.href = "/account/login";
  }

  #isProductInWishlist(productId) {
    return this.wishlistData.wishlisted.some((item) => item.productVariantId === productId);
  }
}

// Initialize WishlistManager
document.addEventListener("DOMContentLoaded", async () => {
  const wishlistManager = new WishlistManager();
  await wishlistManager.wishlistApi.init(); // Explicitly initialize WishlistApi
  wishlistManager.init(); // Initialize WishlistManager separately
});
