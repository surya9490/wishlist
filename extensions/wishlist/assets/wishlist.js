class Wishlist {
  constructor(config = {}) {
    // Fallback for appUrl if not provided
    this.appUrl = 'https://maple-connected-sbjct-fri.trycloudflare.com';

    // Fallback for customerId and shop, use localStorage if not available in window.wishlistData
    this.customerId = window.wishlistData?.customerEmail || localStorage.getItem('customerId') || 'guest';
    this.shop = window.wishlistData?.shop || localStorage.getItem('shop') || 'default-shop';
    
    this.wishlistData = [];

    // Set default selectors if not provided
    this.selectors = config.selectors || {
      toaster: "[wishlist-toaster]",
      toasterMessage: "[wishlist-toaster] [wishlist-message]",
      wishlistIcon: ".wishlist-icon",
    };

    // Set default toasterConfig if not provided
    this.toasterConfig = config.toasterConfig || {
      timer: 5000,
      messages: {
        create: "Product added to wishlist",
        delete: "Product removed from the wishlist",
        error: "Failed to add or remove product to wishlist",
      },
    };

    this.timeout = null;
  }

  // Utility: Debounce function
  debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), timeout);
    };
  }

  // Display toast message
  handleToaster(status) {
    const toaster = document.querySelector(this.selectors.toaster);
    clearTimeout(this.timeout);
    if (!toaster) return;
    const toasterMessage = document.querySelector(this.selectors.toasterMessage);
    const message = this.toasterConfig.messages[status] || this.toasterConfig.messages.error;
    toasterMessage.textContent = message;
    toaster.style.transform = "translateX(0)";

    this.timeout = setTimeout(() => {
      toaster.style.transform = "translateX(-100%)";
    }, this.toasterConfig.timer);
  }

  // Update UI for wishlist icons
  updateUI() {
    document.querySelectorAll(this.selectors.wishlistIcon).forEach((button) => {
      const productId = button.getAttribute("data-product-id");
      const isInWishlist = this.wishlistData.some(
        (item) => item.productVariantId === productId
      );
      button.toggleAttribute("wishlisted", isInWishlist);
    });
  }

  // Fetch wishlist data from the backend API
  async fetchWishlistData() {
    try {
      if (!this.customerId || !this.shop) {
        this.handleToaster("error");
        console.error("Missing customer or shop data");
        return;
      }
      
      const response = await fetch(
        `${this.appUrl}/api/wishlist?customer=${this.customerId}&shop=${this.shop}`
      );
      if (!response.ok) throw new Error("Failed to fetch wishlisted products");

      const data = await response.json();
      this.wishlistData = data.wishlist || [];
      this.updateUI();
    } catch (error) {
      console.error("Error fetching wishlist data:", error);
      this.handleToaster("error");
    }
  }

  // Add product to wishlist
  async addToWishlist(productId) {
    if (!productId) {
      this.handleToaster("error");
      console.error("Product ID is missing.");
      return;
    }

    const action = "create";
    const success = await this.updateWishlist(action, productId);
    if (success) {
      this.wishlistData.push({ shop: this.shop, customerId: this.customerId, productVariantId: productId });
      this.handleToaster("create");
      this.triggerEvent('onAddToWishlist', productId);
    } else {
      this.handleToaster("error");
    }
  }

  // Remove product from wishlist
  async removeFromWishlist(productId) {
    if (!productId) {
      this.handleToaster("error");
      console.error("Product ID is missing.");
      return;
    }

    const action = "delete";
    const success = await this.updateWishlist(action, productId);
    if (success) {
      this.wishlistData = this.wishlistData.filter(
        (item) => item.productVariantId !== productId
      );
      this.handleToaster("delete");
      this.triggerEvent('onRemoveFromWishlist', productId);
    } else {
      this.handleToaster("error");
    }
  }

  // Unified wishlist update function (add/remove)
  async updateWishlist(action, productVariantId) {
    if (!productVariantId) {
      console.error("Product Variant ID is missing.");
      return false;
    }

    const formData = new FormData();
    formData.append("customerId", this.customerId);
    formData.append("productVariantId", productVariantId);
    formData.append("shop", this.shop);
    formData.append("_action", action);

    try {
      const response = await fetch(`${this.appUrl}/api/wishlist`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Failed to ${action} item in wishlist`);
      console.log(
        `Item ${action === "create" ? "added to" : "removed from"} wishlist successfully`
      );
      return true;
    } catch (error) {
      console.error(`Error during ${action} operation:`, error);
      return false;
    }
  }

  // Custom event system to handle adding/removing items
  triggerEvent(eventName, productId) {
    const event = new CustomEvent(eventName, { detail: { productId } });
    document.dispatchEvent(event);
  }

  // Initialize event listeners on the wishlist icons
  initWishlistButtons() {
    document.querySelectorAll(this.selectors.wishlistIcon).forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const productId = button.getAttribute("data-product-id");
        const isInWishlist = this.wishlistData.some(
          (item) => item.productVariantId === productId
        );
        button.toggleAttribute("wishlisted", !isInWishlist);
        if (isInWishlist) {
          await this.removeFromWishlist(productId);
        } else {
          await this.addToWishlist(productId);
        }
      });
    });
  }

  // Initialize the wishlist
  async init() {
    if (this.customerId && this.shop) {
      await this.fetchWishlistData();
    }
    this.initWishlistButtons();
  }
}

// Configuration object for Wishlist (Optional, can be overridden)
const wishlistConfig = {
  toasterConfig: {
    timer: 5000,
    messages: {
      create: "Product added to wishlist",
      delete: "Product removed from the wishlist",
      error: "Failed to add or remove product to wishlist",
    },
  },
};

// Initialize the Wishlist system after the page loads
document.addEventListener("DOMContentLoaded", () => {
  const wishlist = new Wishlist(wishlistConfig);
  wishlist.init();
});
