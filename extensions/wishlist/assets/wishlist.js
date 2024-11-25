class PubSub {
  constructor() {
    this.events = new Map(); // Use a Map for better performance with frequent operations
  }

  /**
   * Subscribes to an event with a callback.
   * @param {string} event - Event name.
   * @param {Function} callback - Callback function.
   */
  subscribe(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set()); // Use a Set to prevent duplicate callbacks
    }
    this.events.get(event).add(callback);
  }

  /**
   * Unsubscribes a callback from an event.
   * @param {string} event - Event name.
   * @param {Function} callback - Callback function to remove.
   */
  unsubscribe(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
      if (this.events.get(event).size === 0) {
        this.events.delete(event); // Clean up the event if no callbacks remain
      }
    }
  }

  /**
   * Publishes an event to all its subscribers.
   * @param {string} event - Event name.
   * @param {any} data - Data to pass to the subscribers.
   */
  publish(event, data) {
    if (!this.events.has(event)) return;
    for (const callback of this.events.get(event)) {
      try {
        callback(data); // Execute each callback safely
      } catch (error) {
        console.error(`Error in callback for event "${event}":`, error);
      }
    }
  }
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const pubsub = new PubSub();

class WishlistUI {
  constructor(wishlistManager, url, shop, customerId) {
    this.wishlistManager = wishlistManager;
    this.wishlistData = { wishlisted: [], variantData: [] };
    this.shop = shop;
    this.customerId = customerId;
    this.appUrl = url;

    this.selectors = {
      dialog: "[wishlist-dialog]",
      close: "[wishlist-close]",
      icon: "[wishlist-header-icon]",
      remove: "[remove-variant]",
      productContainer: ".product-container",
      search: "[type='search']",
    };

    this.dialog = document.querySelector(this.selectors.dialog);
    this.productContainer = null;

    this.init();
  }

  init() {
    this.productContainer = this.getProductContainer();
    pubsub.subscribe("wishlist:count", (params) => this.updateCount(params));

    document.querySelector(this.selectors.icon)?.addEventListener("click", () => this.showDialog());
    this.dialog?.querySelector(this.selectors.close)?.addEventListener("click", () => this.closeDialog());
    this.dialog?.addEventListener("close", () => this.closeDialog());
    this.dialog?.querySelector(this.selectors.search)?.addEventListener("input", (e) => this.debounceSearch(e.target.value));
  }
  debounceSearch = debounce((params) => {
    this.getSearchResults(params);
  }, 300);

  updateCount(params) {
    document.querySelector("[wishlist-count]").textContent = params.count;
  }

  async getSearchResults(query, action) {
    try {
      const response = await fetch(`${this.appUrl}/api/wishlist`, {
        method: "POST",
        body: new URLSearchParams({
          action: action || 'search',
          shop: this.shop,
          query,
          customerId: this.customerId,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch wishlist data.");

      const data = await response.json();
      this.renderProducts(data.variantData);
    } catch (error) {
      console.error("Search Error:", error);
    }
  }

  getProductContainer() {
    let container = this.dialog?.querySelector(this.selectors.productContainer);
    if (!container) {
      container = document.createElement("div");
      container.className = "product-container";
      this.dialog?.appendChild(container);
    }
    return container;
  }

  showDialog() {
    this.dialog?.showModal();
    this.getSearchResults('', 'view')
  }

  closeDialog() {
    this.dialog?.close();
  }

  renderProducts(products) {
    this.productContainer.innerHTML = products
      .map(
        (item) => `
      <div class="product-card" data-variant-id="${item.id}">
        <span class="remove-icon" remove-variant>X</span>
        <a href="/products/${item?.product?.handle}">
          <div class="product-image">
            <img src="${item?.image || item?.product?.featuredMedia?.preview?.image?.url || 'placeholder.jpg'}" alt="${item?.product?.title || 'Product Name'}" />
          </div>
        </a>
        <div class="product-details">
          <h3>${item?.product?.title || 'Product Name'}</h3>
          <p>${item.title}</p>
        </div>
      </div>`
      )
      .join("");

    this.productContainer.querySelectorAll(this.selectors.remove)?.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        let variantId = e.target.closest(".product-card")?.getAttribute("data-variant-id");
        variantId = variantId.split('/').pop();
        e.target.closest(".product-card")?.remove();
        pubsub.publish("wishlist:action", { action: "remove", productVariantId: variantId });
      });
    });
  }
}


class WishlistApi {
  constructor(wishlistManager, appUrl, shop, customerId, wishlistData) {
    this.wishlistManager = wishlistManager;
    this.appUrl = appUrl;
    this.shop = shop;
    this.customerId = customerId;
    this.wishlistData = { wishlisted: [], variantData: [] };

  }

  async init() {
    await this.loadWishListData();
    pubsub.subscribe('wishlist:action', (data) => this.handleWishlistAction(data))
  }

  async loadWishListData() {
    try {
      const data = await this.getWishlistedData();
      const syncedData = await this.syncUserDataWithGuest(data);
      this.wishlistManager.handleUpdatedData({ data: syncedData, action: "load", response: syncedData?.count });
      this.wishlistData = syncedData;
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
      pubsub.publish("wishlist:count", { count: response.count });
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
    debugger
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
        variantData = variantData.filter((item) => item.id.includes(productVariantId));
        break;
      default:
        console.warn("Unknown action:", action);
        break;
    }
    this.wishlistData = { wishlisted, variantData };
    if (!this.customerId) {
      this.setGuestData(this.wishlistData);
    }

    pubsub.publish("wishlist:updated", { data:this.wishlistData, action, response, count: response.count });

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
  #appUrl = "https://leadership-romania-chan-nokia.trycloudflare.com";
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

  handleUpdatedData({ data, action, response }) {
    console.log(this.wishlistData)
    this.wishlistData = data;
    console.log(this.wishlistData)
    this.#updateUI();
    if (action === 'add' || action === 'remove') {
      this.#triggerEvent(response?.method, response?.variantData[0]);
      this.#showToaster(action, response?.variantData[0]);
    }
    pubsub.publish('wishlist:count', { count: response?.count || response })
    this.#handleVariantChange()
  }

  #updateUI() {
    const useVariantId = this.#options.variantChange;

    document.querySelectorAll(this.#selectors.wishlistIcon).forEach((button) => {
      const productId = button.getAttribute(
        useVariantId ? "data-product-id" : "data-product-handle"
      );
      const isWishlisted = this.wishlistData?.wishlisted?.some((item) =>
        useVariantId
          ? item.productVariantId === productId
          : item.productHandle === productId
      );
      button.toggleAttribute("wishlisted", isWishlisted);
    });
  }

  #debounceWishlistAction = debounce((params) => {
    pubsub.publish('wishlist:action', params)
  }, 300);


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

  #showToaster(status, data) {
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
