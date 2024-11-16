document.addEventListener("DOMContentLoaded", async () => {
  const appUrl = "https://royal-path-forwarding-belfast.trycloudflare.com";
  let customerId, shop;
  let wishlistData = [];
  let timeout;

  const selectors = {
    toaster: "[wishlist-toaster]",
    toasterMessage: "[wishlist-toaster] [wishlist-message]",
  };

  const toasterConfig = {
    timer: 5000,
    messages: {
      create: "Product added to wishlist",
      delete: "Product removed from the wishlist",
      error: "Failed to add or remove product to wishlist",
    },
  };

  /**
   * Utility: Debounce function
   */
  const debounce = (func, timeout = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), timeout);
    };
  };

  /**
   * Display toast message
   */
  const handleToaster = (status) => {
    const toaster = document.querySelector(selectors.toaster);
    clearTimeout(timeout);
    if (!toaster) return
    const toasterMessage = document.querySelector(selectors.toasterMessage);
    const message =
      toasterConfig.messages[status] || toasterConfig.messages.error;
    toasterMessage.textContent = message;
    toaster.style.transform = "translateX(0)";

    timeout = setTimeout(() => {
      toaster.style.transform = "translateX(-100%)";
    }, toasterConfig.timer);
  };

  /**
   * Update UI for wishlist icons
   */
  const updateUI = () => {
    document.querySelectorAll(".wishlist-icon").forEach((button) => {
      const productId = button.getAttribute("data-product-id");
      const isInWishlist = wishlistData.some(
        (item) => item.productVariantId === productId
      );
      button.toggleAttribute("wishlisted", isInWishlist);
    });
  };

  /**
   * Fetch wishlist data and update UI
   */
  const fetchWishlistData = async () => {
    try {
      const response = await fetch(
        `${appUrl}/api/wishlist?customer=${customerId}&shop=${shop}`
      );
      if (!response.ok) throw new Error("Failed to fetch wishlisted products");

      const data = await response.json();
      wishlistData = data.wishlist || [];
      updateUI();
    } catch (error) {
      console.error("Error fetching wishlist data:", error);
      handleToaster("error");
    }
  };

  /**
   * Handle wishlist action (add/remove)
   */
  const handleWishlistAction = async (button) => {
    const productId = button.getAttribute("data-product-id");
    const isInWishlist = wishlistData.some(
      (item) => item.productVariantId === productId
    );

    // Optimistic UI update
    button.toggleAttribute("wishlisted", !isInWishlist);

    const action = isInWishlist ? "delete" : "create";
    const success = await updateWishlist(action, customerId, productId, shop);

    if (success) {
      // Update local wishlist data
      if (action === "delete") {
        wishlistData = wishlistData.filter(
          (item) => item.productVariantId !== productId
        );
        handleToaster("delete");
      } else {
        wishlistData.push({ productVariantId: productId });
        handleToaster("create");
      }
    } else {
      // Revert UI if API call fails
      button.toggleAttribute("wishlisted", isInWishlist);
      handleToaster("error");
    }
  };

  /**
   * Unified wishlist update function (add/remove)
   */
  const updateWishlist = async (action, customerId, productVariantId, shop) => {
    const formData = new FormData();
    formData.append("customerId", customerId);
    formData.append("productVariantId", productVariantId);
    formData.append("shop", shop);
    formData.append("_action", action);

    try {
      const response = await fetch(`${appUrl}/api/wishlist`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Failed to ${action} item in wishlist`);
      console.log(
        `Item ${action === "create" ? "added to" : "removed from"
        } wishlist successfully`
      );
      return true;
    } catch (error) {
      console.error(`Error during ${action} operation:`, error);
      return false;
    }
  };

  /**
   * Initialize application
   */
  if (window.wishlistData?.customerEmail && window.wishlistData?.shop) {
    ({ customerEmail: customerId, shop } = window.wishlistData);
    await fetchWishlistData();
  }

  /**
   * Debounced wishlist action handler
   */
  const debouncedHandleWishlistAction = debounce(async (button) => {
    await handleWishlistAction(button);
  });

  /**
   * Event listener for wishlist actions
   */
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wishlist-icon");
    if (!button || !customerId || !shop) return;
    debouncedHandleWishlistAction(button);
  });
});


document.addEventListener("change", async (event) => {
 console.log(event.target);
});
