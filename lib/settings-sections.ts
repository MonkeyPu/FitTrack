import { Database, Flag, Lock, Palette, Ruler, Target, UserRound, type LucideIcon } from "lucide-react";

export const SETTINGS_SECTIONS: { slug: string; title: string; sub: string; icon: LucideIcon }[] = [
  { slug: "account", title: "Account", sub: "Name, username, photo, email, password", icon: UserRound },
  { slug: "targets", title: "Nutrition targets", sub: "Calories, protein and optional nutrient goals", icon: Target },
  { slug: "body", title: "Body stats", sub: "Your weight, for cardio calories", icon: Ruler },
  { slug: "goal", title: "Goal", sub: "Your goal and target date", icon: Flag },
  { slug: "privacy", title: "Privacy", sub: "What your friends can see", icon: Lock },
  { slug: "appearance", title: "Appearance", sub: "Theme, accent color, effects", icon: Palette },
  { slug: "data", title: "Your data", sub: "Export or delete your account", icon: Database },
];
