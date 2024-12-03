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
        input: "checkbox",
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
        input: "checkbox",
        type: "checkbox",
        name: "variantDetection",
        default: true,
        target: "options.variantChange",
      },
      {
        id: "guestWishList",
        label: "Guest Wish List",
        input: "checkbox",
        type: "checkbox",
        name: "guestWishList",
        default: true,
        target: "options.guestWishList",
      },
      {
        id: "toaster",
        label: "Toaster",
        input: "checkbox",
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
        input: "input",
        type: "text",
        name: "add",
        default: "Product added to wishlist",
        target: "defaultToasterConfig.messages.add",
      },
      {
        id: "remove",
        label: "Remove from Wishlist",
        input: "input",
        type: "text",
        name: "remove",
        default: "Product removed from wishlist",
        target: "defaultToasterConfig.messages.remove",
      },
      {
        id: "fetch",
        label: "Fetch from Wishlist",
        input: "input",
        type: "text",
        name: "fetch",
        default: "Product fetched from wishlist",
        target: "defaultToasterConfig.messages.fetch",
      },
      {
        id: "error",
        label: "Error",
        input: "input",
        type: "text",
        name: "error",
        default: "Failed to update wishlist",
        target: "defaultToasterConfig.messages.error",
      },
      {
        id: "timer",
        label: "Timer",
        input: "input",
        type: "number",
        name: "timer",
        default: 5000,
        target: "defaultToasterConfig.timer",
      },
    ],
  },
];
