export const defaultConfig = {
  "wishlist": true,
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


export const tabs = [
  {
    id: "App_Status",
    subHeading: "App Status",
    caption: "",
    settings: [
      {
        id: "showWishlist",
        label: "Show Wishlist",
        type: "checkbox",
        name: "showWishlist",
        default: true,
        target: "showWishlist",
      },
    ],
  },
  {
    id: "General",
    subHeading: "General",
    caption: "Configure the storefront UI settings to start and explore the Wishlist benefits for your store.",
    settings: [
      {
        id: "variantDetection",
        label: "Variant Detection",
        type: "checkbox",
        name: "variantDetection",
        default: true,
        target: "options.variantChange",
      },
      {
        id: "guestWishList",
        label: "Guest Wish List",
        type: "checkbox",
        name: "guestWishList",
        default: true,
        target: "options.guestWishList",
      },
      {
        id: "toaster",
        label: "Toaster",
        type: "checkbox",
        name: "toaster",
        default: true,
        target: "options.toaster",
      },
    ],
  },
  {
    id: "toaster",
    subHeading: "Notification Settings",
    caption: "",
    settings: [
      {
        id: "add",
        label: "Add to Wishlist",
        type: "input",
        name: "add",
        default: "Product added to wishlist",
        target: "defaultToasterConfig.messages.add",
      },
      {
        id: "remove",
        label: "Remove from Wishlist",
        type: "input",
        name: "remove",
        default: "Product removed from wishlist",
        target: "defaultToasterConfig.messages.remove",
      },
      {
        id: "fetch",
        label: "Fetch from Wishlist",
        type: "input",
        name: "fetch",
        default: "Product fetched from wishlist",
        target: "defaultToasterConfig.messages.fetch",
      },
      {
        id: "error",
        label: "Error",
        type: "input",
        name: "error",
        default: "Failed to update wishlist",
        target: "defaultToasterConfig.messages.error",
      },
    ],
  },
];
