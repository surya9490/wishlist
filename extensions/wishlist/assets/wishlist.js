document.addEventListener("DOMContentLoaded", async () => {
  const appUrl = 'https://introduction-happiness-management-working.trycloudflare.com';
  let customerId, shop;
  let wishlistData = [];

  // Debounce utility function
  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  // Update UI for all wishlist icons
  const updateUI = () => {
    document.querySelectorAll(".wishlist-icon").forEach((button) => {
      const productId = button.getAttribute("data-product-id");
      const isInWishlist = wishlistData.some((item) => item.productVariantId === productId);
      button.toggleAttribute("wishlisted", isInWishlist);
    });
  };

  // Fetch wishlist data and update UI
  const fetchWishlistData = async () => {
    try {
      const response = await fetch(`${appUrl}/api/wishlist?customer=${customerId}&shop=${shop}`);
      if (!response.ok) throw new Error("Failed to fetch wishlisted products");

      const data = await response.json();
      wishlistData = data.wishlist || [];
      updateUI();
    } catch (error) {
      console.error("Error fetching wishlist data:", error);
    }
  };

  // Initialize if customer data is available
  if (window.wishlistData?.customerEmail && window.wishlistData?.shop) {
    ({ customerEmail: customerId, shop } = window.wishlistData);
    await fetchWishlistData();
  }

  // Debounced version of handleWishlistAction
  const debouncedHandleWishlistAction = debounce(async (button) => {
    await handleWishlistAction(button);
  });

  // Event listener for wishlist actions
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".wishlist-icon");
    if (!button || !customerId || !shop) return;

    // Call the debounced function
    debouncedHandleWishlistAction(button);
  });

  // Handle wishlist button click action
  const handleWishlistAction = async (button) => {
    const productId = button.getAttribute("data-product-id");
    const isInWishlist = wishlistData.some((item) => item.productVariantId === productId);

    // Optimistically toggle UI
    button.toggleAttribute("wishlisted", !isInWishlist);

    const action = isInWishlist ? 'delete' : 'create';
    const success = await updateWishlist(action, customerId, productId, shop);

    if (success) {
      // Update local wishlist data
      if (action === 'delete') {
        wishlistData = wishlistData.filter((item) => item.productVariantId !== productId);
      } else {
        wishlistData.push({ productVariantId: productId });
      }
    } else {
      // Revert UI if the API call fails
      button.toggleAttribute("wishlisted", isInWishlist);
    }
  };

  // Unified wishlist update function
  const updateWishlist = async (action, customerId, productVariantId, shop) => {
    const formData = new FormData();
    formData.append('customerId', customerId);
    formData.append('productVariantId', productVariantId);
    formData.append('shop', shop);
    formData.append('_action', action);

    try {
      const response = await fetch(`${appUrl}/api/wishlist`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Failed to ${action} item in wishlist`);
      console.log(`Item ${action === 'create' ? 'added to' : 'removed from'} wishlist successfully`);
      return true;
    } catch (error) {
      console.error(`Error during ${action} operation:`, error);
      return false;
    }
  };
});
