import React from 'react';
import {
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Coffee,
  HeartPulse,
  GraduationCap,
  Gift,
  MoreHorizontal,
  Briefcase,
  Trophy,
  Laptop,
  TrendingUp,
  Coins,
  Landmark,
  Wallet,
  Smartphone,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  PiggyBank,
  Receipt,
  HelpCircle,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5', color }) => {
  const iconMap: Record<string, React.ElementType> = {
    Utensils,
    Car,
    Home,
    Zap,
    ShoppingBag,
    Coffee,
    HeartPulse,
    GraduationCap,
    Gift,
    MoreHorizontal,
    Briefcase,
    Trophy,
    Laptop,
    TrendingUp,
    Coins,
    Landmark,
    Wallet,
    Smartphone,
    Banknote,
    CreditCard,
    ArrowRightLeft,
    PiggyBank,
    Receipt,
  };

  const IconComponent = iconMap[name] || HelpCircle;

  return <IconComponent className={className} style={color ? { color } : undefined} />;
};
