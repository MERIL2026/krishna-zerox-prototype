export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  badge?: string;
  image: string;
  swatch: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "soft-grid-journal",
    name: "Soft Grid Journal",
    category: "Notebooks",
    price: 349,
    oldPrice: 420,
    rating: 4.9,
    badge: "BESTSELLER",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85",
    swatch: "#F6A8C9",
    description: "A calm place for lists, sketches and all the ideas that arrive at once.",
  },
  {
    id: "orchard-gel-pens",
    name: "Orchard Gel Pens",
    category: "Pens",
    price: 189,
    rating: 4.8,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85",
    swatch: "#DDF46A",
    description: "A five-piece color story with a smooth, almost-too-good ink flow.",
  },
  {
    id: "tiny-treasure-kit",
    name: "Tiny Treasure Kit",
    category: "Gifts",
    price: 790,
    rating: 4.7,
    badge: "LIMITED",
    image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=85",
    swatch: "#C9B5F5",
    description: "A considered little gift set for desks, birthdays and just-because days.",
  },
  {
    id: "studio-wash-tape",
    name: "Studio Washi Set",
    category: "Aesthetic",
    price: 295,
    rating: 4.9,
    badge: "TRENDING",
    image: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85",
    swatch: "#8FE4D1",
    description: "Three low-tack tapes for tidy pages, parcels and tiny visual detours.",
  },
  {
    id: "citrus-highlighter-set",
    name: "Citrus Highlighter Set",
    category: "School",
    price: 220,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=85",
    swatch: "#FFF28A",
    description: "Quietly bright, easy to spot, and kind to the page underneath.",
  },
  {
    id: "daydream-stickers",
    name: "Daydream Sticker Sheet",
    category: "Custom",
    price: 149,
    rating: 4.8,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=900&q=85",
    swatch: "#DCC9F7",
    description: "Glossy little accents for bottles, journals, laptops and happy mail.",
  },
];

export const categories = [
  { label: "Stationery", kicker: "Everyday magic", color: "pink", art: "✎", count: "240+ pieces" },
  { label: "Gifts", kicker: "Good things", color: "yellow", art: "✦", count: "For every mood" },
  { label: "Toys", kicker: "Play nicely", color: "lavender", art: "◌", count: "Curated picks" },
  { label: "Aesthetic", kicker: "Pretty useful", color: "mint", art: "✿", count: "Desk joy" },
  { label: "Custom", kicker: "Make it yours", color: "purple", art: "⌁", count: "Made for you" },
  { label: "Printing", kicker: "Ready when you are", color: "cyan", art: "▣", count: "From ₹3.50" },
  { label: "Imported", kicker: "Found abroad", color: "peach", art: "↗", count: "New arrivals" },
  { label: "More", kicker: "Keep exploring", color: "cream", art: "+", count: "See it all" },
] as const;

export type CartLine = Product & { quantity: number };

export const customProducts = [
  { label: "Custom mugs", art: "☕", color: "pink" },
  { label: "Photo prints", art: "▧", color: "yellow" },
  { label: "Sticker sheets", art: "✦", color: "lavender" },
  { label: "Invitations", art: "✉", color: "mint" },
];
