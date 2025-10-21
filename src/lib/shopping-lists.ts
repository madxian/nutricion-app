
import type { Goal } from '@/lib/types';

type Language = 'es' | 'en';

const fixedIngredients: Record<Language, string[]> = {
    es: [
        'Sal', 'Pimienta', 'Canela en polvo', 'Tomillo', 
        'Laurel', 'Paprika', 'Oregano', 'Albahaca'
    ],
    en: [
        'Salt', 'Pepper', 'Cinnamon powder', 'Thyme',
        'Bay leaf', 'Paprika', 'Oregano', 'Basil'
    ]
};

const shoppingLists: Record<Language, Record<Goal, string[]>> = {
  es: {
    maintain: [
      'tomates cherry', 'Canela en polvo', 'Manzana roja', 'Aceite de oliva', 'Cebolla cabezona blanca', 'Aguacate Hass', 'Agua', 'Cebolla larga', 'Ajo', 'Esencia de vainilla', 'Cebolla morada', 'Almendras', 'clara', 'Arepa de maíz', 'hojas de lechuga', 'Arroz blanco', 'huevos', 'Avena en hojuelas', 'Laurel', 'Banano', 'Limón', 'Carne de res magra', 'Orégano', 'Carne molida magra de res', 'Paprika', 'Cilantro', 'Pimentón', 'Espinaca baby', 'Pimienta', 'Fresas', 'Sal', 'Habichuelas', 'Tomate', 'Harina de maiz precocida para arepas', 'Tomillo', 'Jamón de cerdo', 'tortillas de maiz', 'Maiz pira natural', 'Albahaca', 'Mango', 'Mantequilla', 'Maní', 'Mantequilla de mani natural', 'Miel', 'Mostaza', 'Muslo de pollo', 'Pan integral', 'Papa', 'Papaya', 'Pasta de tomate casera', 'Pasta de trigo integral', 'Pechuga de pollo', 'Piña', 'Plátano maduro', 'Plátano verde', 'Queso campesino', 'Queso mozzarella', 'Queso parmesano', 'Semillas de chia', 'Tilapia', 'Yogur griego natural sin azúcar', 'Zanahoria', 'Aceite de coco', 'Camarones', 'Mayonesa', 'Queso de búfala tipo burrata', 'Rúgula', 'Jamón serrano'
    ],
    lose: [
      'huevos', 'hojas de lechuga', 'Tomate', 'Canela en polvo', 'Sal', 'clara', 'Pimienta', 'Cebolla larga', 'Limón', 'Orégano', 'Paprika', 'tomate cherry', 'Cebolla cabezona blanca', 'Tomillo', 'Laurel', 'cebolla roja', 'Albahaca', 'Cebolla morada', 'Arepa de maiz', 'Aguacate Hass', 'Mantequilla de mani natural', 'Pan integral', 'Jamón de pechuga de pavo', 'Queso mozzarella', 'Mantequilla', 'Yogur griego natural sin azúcar', 'Mango', 'Miel', 'Fresas', 'Semillas de chia', 'Papa', 'Pechuga de pollo', 'Papa criolla', 'Carne de res magra', 'Ajo', 'Cilantro', 'Espinacas', 'Muslo de pollo', 'Tilapia', 'Mostaza', 'Atún en agua', 'Plátano maduro', 'Champiñones', 'Sandia', 'Jamón de cerdo', 'Manzana roja', 'Almendras', 'Tocineta', 'Zanahoria', 'Aceite de oliva', 'Agua', 'Brócoli', 'Pepino', 'Habichuelas', 'Plátano verde', 'Queso campesino', 'Piña', 'Coliflor'
    ],
    gain: [
      'huevos', 'hojas de lechuga', 'Tomate', 'Canela en polvo', 'Sal', 'clara', 'Pimienta', 'Cebolla larga', 'Pimentón', 'Limón', 'Oregano', 'Paprika', 'tomates cherry', 'Cebolla cabezona blanca', 'Tomillo', 'Laurel', 'pasta para lasaña', 'tortillas de maiz', 'Arepa de maíz', 'Aguacate Hass', 'Papaya', 'Mantequilla de maní natural', 'Pan integral', 'Jamón de pechuga de pavo', 'Queso mozzarella', 'Mantequilla', 'Yogur griego natural sin azúcar', 'Mango', 'Miel', 'Avena en hojuelas', 'Banano', 'Fresas', 'Maíz pira natural', 'Semillas de chía', 'Papa', 'Pechuga de pollo', 'Papa criolla', 'Cebolla morada', 'Ajo', 'Cilantro', 'Pasta de trigo integral', 'Queso parmesano', 'Carne de res magra', 'Arroz blanco', 'Harina de maíz precocida para arepas', 'Carne molida magra de res', 'Pasta de tomate casera', 'Espinacas', 'Crema de leche baja en grasa', 'Muslo de pollo', 'Tilapia', 'Yogur de fresa sin azúcar', 'Maní', 'Granola', 'Mostaza', 'Atún en agua', 'Plátano', 'Champiñones', 'Espinaca baby', 'Aceite de oliva', 'Agua', 'Esencia de vainilla'
    ],
  },
  en: {
    maintain: [
        'cherry tomatoes', 'Cinnamon powder', 'Red apple', 'Olive oil', 'White onion', 'Hass avocado', 'Water', 'Green onion', 'Garlic', 'Vanilla extract', 'Red onion', 'Almonds', 'egg white', 'Corn arepa', 'lettuce leaves', 'White rice', 'eggs', 'Rolled oats', 'Bay leaf', 'Banana', 'Lemon', 'Lean beef', 'Oregano', 'Lean ground beef', 'Paprika', 'Cilantro', 'Bell pepper', 'Baby spinach', 'Pepper', 'Strawberries', 'Salt', 'Green beans', 'Tomato', 'Pre-cooked cornmeal for arepas', 'Thyme', 'Pork ham', 'corn tortillas', 'Natural popcorn', 'Basil', 'Mango', 'Butter', 'Peanuts', 'Natural peanut butter', 'Honey', 'Mustard', 'Chicken thigh', 'Whole wheat bread', 'Potato', 'Papaya', 'Homemade tomato paste', 'Whole wheat pasta', 'Chicken breast', 'Pineapple', 'Ripe plantain', 'Green plantain', 'Farmer\'s cheese', 'Mozzarella cheese', 'Parmesan cheese', 'Chia seeds', 'Tilapia', 'Plain unsweetened Greek yogurt', 'Carrot', 'Coconut oil', 'Shrimp', 'Mayonnaise', 'Buffalo burrata cheese', 'Arugula', 'Serrano ham'
    ],
    lose: [
        'eggs', 'lettuce leaves', 'Tomato', 'Cinnamon powder', 'Salt', 'egg white', 'Pepper', 'Green onion', 'Lemon', 'Oregano', 'Paprika', 'cherry tomato', 'White onion', 'Thyme', 'Bay leaf', 'red onion', 'Basil', 'Red onion', 'Corn arepa', 'Hass avocado', 'Natural peanut butter', 'Whole wheat bread', 'Turkey breast ham', 'Mozzarella cheese', 'Butter', 'Plain unsweetened Greek yogurt', 'Mango', 'Honey', 'Strawberries', 'Chia seeds', 'Potato', 'Chicken breast', 'Baby potato', 'Lean beef', 'Garlic', 'Cilantro', 'Spinach', 'Chicken thigh', 'Tilapia', 'Mustard', 'Tuna in water', 'Ripe plantain', 'Mushrooms', 'Watermelon', 'Pork ham', 'Red apple', 'Almonds', 'Bacon', 'Carrot', 'Olive oil', 'Water', 'Broccoli', 'Cucumber', 'Green beans', 'Green plantain', 'Farmer\'s cheese', 'Pineapple', 'Cauliflower'
    ],
    gain: [
        'eggs', 'lettuce leaves', 'Tomato', 'Cinnamon powder', 'Salt', 'egg white', 'Pepper', 'Green onion', 'Bell pepper', 'Lemon', 'Oregano', 'Paprika', 'cherry tomatoes', 'White onion', 'Thyme', 'Bay leaf', 'lasagna pasta', 'corn tortillas', 'Corn arepa', 'Hass avocado', 'Papaya', 'Natural peanut butter', 'Whole wheat bread', 'Turkey breast ham', 'Mozzarella cheese', 'Butter', 'Plain unsweetened Greek yogurt', 'Mango', 'Honey', 'Rolled oats', 'Banana', 'Strawberries', 'Natural popcorn', 'Chia seeds', 'Potato', 'Chicken breast', 'Baby potato', 'Red onion', 'Garlic', 'Cilantro', 'Whole wheat pasta', 'Parmesan cheese', 'Lean beef', 'White rice', 'Pre-cooked cornmeal for arepas', 'Lean ground beef', 'Homemade tomato paste', 'Spinach', 'Low-fat cream', 'Chicken thigh', 'Tilapia', 'Sugar-free strawberry yogurt', 'Peanuts', 'Granola', 'Mustard', 'Tuna in water', 'Plantain', 'Mushrooms', 'Baby spinach', 'Olive oil', 'Water', 'Vanilla extract'
    ]
  }
};


export { shoppingLists, fixedIngredients };
