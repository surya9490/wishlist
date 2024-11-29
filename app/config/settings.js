export const defaultConfig = {
  "options": {
    "toaster": true,
    "guestWishList": true,
    "variantChange": true
  },
  "defaultSelectors": {
    "toaster": "[wishlist-toaster]",
    "toasterMessage": "[wishlist-toaster] [wishlist-message]",
    "wishlistIcon": ".wishlist-icon",
    "variantChange": "fieldset input[type='checkbox'], fieldset input[type='radio']"
  },
  "defaultToasterConfig": {
    "timer": 5000,
    "messages": {
      "add": "Product added to wishlist",
      "remove": "Product removed from wishlist",
      "fetch": "Product added to wishlist",
      "error": "Failed to update wishlist"
    }
  }
}

export const defaultMetaFields = {
  "namespace": "wishlist",
  "key": "app_settings",
  "type": "json",
}