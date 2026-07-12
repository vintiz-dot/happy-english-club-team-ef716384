-- Create avatars table
CREATE TABLE IF NOT EXISTS public.avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active avatars
CREATE POLICY "Users can view active avatars"
ON public.avatars
FOR SELECT
USING (is_active = true);

-- Insert 20 avatars (15 standard, 5 premium)
INSERT INTO public.avatars (name, image_url, is_premium, display_order) VALUES
  -- Standard avatars (1-15)
  ('Blue Circle', 'https://api.dicebear.com/7.x/shapes/svg?seed=blue1&backgroundColor=3b82f6', false, 1),
  ('Green Square', 'https://api.dicebear.com/7.x/shapes/svg?seed=green1&backgroundColor=22c55e', false, 2),
  ('Blue Triangle', 'https://api.dicebear.com/7.x/shapes/svg?seed=blue1&backgroundColor=2563eb', false, 3),
  ('Orange Star', 'https://api.dicebear.com/7.x/shapes/svg?seed=orange1&backgroundColor=f97316', false, 4),
  ('Pink Heart', 'https://api.dicebear.com/7.x/shapes/svg?seed=pink1&backgroundColor=ec4899', false, 5),
  ('Cyan Wave', 'https://api.dicebear.com/7.x/shapes/svg?seed=cyan1&backgroundColor=06b6d4', false, 6),
  ('Yellow Sun', 'https://api.dicebear.com/7.x/shapes/svg?seed=yellow1&backgroundColor=eab308', false, 7),
  ('Red Flame', 'https://api.dicebear.com/7.x/shapes/svg?seed=red1&backgroundColor=ef4444', false, 8),
  ('Indigo Moon', 'https://api.dicebear.com/7.x/shapes/svg?seed=indigo1&backgroundColor=6366f1', false, 9),
  ('Teal Leaf', 'https://api.dicebear.com/7.x/shapes/svg?seed=teal1&backgroundColor=14b8a6', false, 10),
  ('Lime Bolt', 'https://api.dicebear.com/7.x/shapes/svg?seed=lime1&backgroundColor=84cc16', false, 11),
  ('Rose Flower', 'https://api.dicebear.com/7.x/shapes/svg?seed=rose1&backgroundColor=f43f5e', false, 12),
  ('Sky Cloud', 'https://api.dicebear.com/7.x/shapes/svg?seed=sky1&backgroundColor=0ea5e9', false, 13),
  ('Amber Fire', 'https://api.dicebear.com/7.x/shapes/svg?seed=amber1&backgroundColor=f59e0b', false, 14),
  ('Violet Dream', 'https://api.dicebear.com/7.x/shapes/svg?seed=violet1&backgroundColor=8b5cf6', false, 15),
  -- Premium avatars (16-20)
  ('Gold Crown', 'https://api.dicebear.com/7.x/shapes/svg?seed=gold1&backgroundColor=fbbf24&scale=120', true, 16),
  ('Diamond Sparkle', 'https://api.dicebear.com/7.x/shapes/svg?seed=diamond1&backgroundColor=e0e7ff&scale=120', true, 17),
  ('Platinum Shield', 'https://api.dicebear.com/7.x/shapes/svg?seed=platinum1&backgroundColor=cbd5e1&scale=120', true, 18),
  ('Ruby Gem', 'https://api.dicebear.com/7.x/shapes/svg?seed=ruby1&backgroundColor=dc2626&scale=120', true, 19),
  ('Emerald Trophy', 'https://api.dicebear.com/7.x/shapes/svg?seed=emerald1&backgroundColor=059669&scale=120', true, 20);