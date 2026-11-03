// Explicit imports keep the bundle small (a `* as Icons` import would ship every icon).
import {
  Banknote, Bike, BookOpen, Briefcase, Bus, Car, Coffee, Dumbbell, Film, Fuel, Gamepad2, Gift,
  GraduationCap, HeartPulse, House, Landmark, Laptop, Lightbulb, Music, PiggyBank, Pill, Plane,
  Receipt, Scissors, ShieldCheck, Shirt, ShoppingBasket, Smartphone, Sparkles, Tag, Train, Utensils,
  Wallet, Zap,
} from 'lucide-react';

export const ICONS = {
  Banknote, Bike, BookOpen, Briefcase, Bus, Car, Coffee, Dumbbell, Film, Fuel, Gamepad2, Gift,
  GraduationCap, HeartPulse, House, Landmark, Laptop, Lightbulb, Music, PiggyBank, Pill, Plane,
  Receipt, Scissors, ShieldCheck, Shirt, ShoppingBasket, Smartphone, Sparkles, Tag, Train, Utensils,
  Wallet, Zap,
};

export const getIcon = (name) => ICONS[name] ?? Tag;
