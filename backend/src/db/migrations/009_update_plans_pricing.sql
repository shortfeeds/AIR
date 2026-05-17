-- Update plans list with new trial details and scale minutes
UPDATE global_settings 
SET value = '{
  "starter": {"minutes": 200, "price": 299900, "label": "Starter"},
  "growth": {"minutes": 500, "price": 499900, "label": "Growth"},
  "pro": {"minutes": 1000, "price": 799900, "label": "Pro"},
  "scale": {"minutes": 1500, "price": 999900, "label": "Scale"},
  "trial": {"minutes": 30, "price": 99900, "label": "Trial (30 Mins)"}
}'::jsonb 
WHERE key = 'plans';
