/**
 * English food words → the Spanish words used in Mercadona product names and categories, so "chicken" finds "Pollo".
 * Everything is lower case without accents (ñ is written n). A plain entry matches words that START with it
 * ("yogur" finds "yogures"); an entry ending in $ must be the whole word ("sal$" finds "sal" but not "salsa").
 * Typed plurals are handled by the search ("eggs" looks up "egg"). Add a line here to teach the search a new word.
 */
export const WORDS: Record<string, string[]> = {
  // dairy and eggs
  milk: ["leche"], egg: ["huevo"], butter: ["mantequilla"], cheese: ["queso"], cream: ["nata", "crema"],
  yogurt: ["yogur"], yoghurt: ["yogur"], yogourt: ["yogur"], custard: ["natilla", "crema"], pudding: ["flan", "natilla", "postre"],
  dessert: ["postre"], skimmed: ["desnatad", "semidesnatad"], skim: ["desnatad", "semidesnatad"], whole: ["entera", "entero", "integral"],
  lactose: ["lactosa"], gluten: ["gluten"], free: ["sin"], vegan: ["vegano", "vegetal"], vegetarian: ["vegetariano"],
  organic: ["ecologico", "bio"], light: ["light", "ligero"], low: ["bajo"], high: ["alto"], protein: ["proteina", "proteico"],
  fat: ["grasa"], fiber: ["fibra"], fibre: ["fibra"], sugar: ["azucar"], sweetener: ["edulcorante"], diet: ["light", "zero"],
  // bread, pasta, cereals, baking
  bread: ["pan$", "panes$", "panecillo", "baguette", "barra"], toast: ["tostada", "pan$"], roll: ["panecillo", "bollo"], bun: ["bollo", "panecillo"],
  flour: ["harina"], yeast: ["levadura"], rice: ["arroz"], noodle: ["fideo", "tallarin", "noodle"], spaghetti: ["espagueti"],
  macaroni: ["macarron"], oat: ["avena"], corn: ["maiz"], wheat: ["trigo"], barley: ["cebada"], rye: ["centeno"],
  cracker: ["galleta", "cracker", "tostada"], cookie: ["galleta"], biscuit: ["galleta"], cake: ["bizcocho", "tarta", "pastel"],
  pie: ["tarta", "empanada"], croissant: ["cruasan"], muffin: ["magdalena", "muffin"], donut: ["donut", "rosquilla"], doughnut: ["donut", "rosquilla"],
  pastry: ["bolleria", "pasteleria", "hojaldre"], waffle: ["gofre"], pancake: ["tortita", "crepe"], breakfast: ["desayuno"],
  // sweets and snacks
  candy: ["caramelo", "golosina"], sweet: ["dulce", "caramelo", "golosina"], gum: ["chicle"], snack: ["snack", "aperitivo"], honey: ["miel"],
  jam: ["mermelada", "confitura"], marmalade: ["mermelada"], syrup: ["sirope", "jarabe"], cocoa: ["cacao"], nut: ["nuez", "nueces", "fruto"],
  almond: ["almendra"], walnut: ["nuez", "nueces"], peanut: ["cacahuete"], hazelnut: ["avellana"], pistachio: ["pistacho"],
  cashew: ["anacardo"], raisin: ["pasa", "pasas"], seed: ["semilla", "pipa"], sunflower: ["girasol"], sesame: ["sesamo"],
  // meat
  meat: ["carne"], chicken: ["pollo"], turkey: ["pavo"], beef: ["ternera", "vacuno", "buey"], veal: ["ternera"], pork: ["cerdo"],
  ham: ["jamon"], bacon: ["bacon", "beicon", "panceta"], sausage: ["salchicha", "chorizo", "longaniza", "butifarra"], burger: ["hamburguesa"],
  meatball: ["albondiga"], steak: ["filete", "chuleton", "entrecot", "solomillo"], rib: ["costilla"], lamb: ["cordero"], duck: ["pato"],
  rabbit: ["conejo"], minced: ["picada", "picado"], mince: ["picada", "picado"], ground: ["picada", "picado", "molido"], breast: ["pechuga"],
  thigh: ["muslo"], wing: ["ala$", "alas$", "alita"], liver: ["higado"], salami: ["salchichon", "salami"], fillet: ["filete", "lomo"],
  tenderloin: ["solomillo", "lomo"], cured: ["curado", "curada"], sliced: ["lonchas", "loncha", "rodajas", "laminado"], slice: ["lonchas", "loncha", "rodajas"],
  // fish and seafood
  fish: ["pescado"], salmon: ["salmon"], tuna: ["atun"], cod: ["bacalao"], hake: ["merluza"], sardine: ["sardina"], anchovy: ["anchoa", "boqueron"],
  mackerel: ["caballa"], trout: ["trucha"], bream: ["dorada"], shrimp: ["gamba", "langostino"], prawn: ["gamba", "langostino"], squid: ["calamar", "sepia"],
  octopus: ["pulpo"], mussel: ["mejillon"], clam: ["almeja"], crab: ["cangrejo", "surimi"], lobster: ["langosta"], seafood: ["marisco"],
  smoked: ["ahumado", "ahumada"], canned: ["lata", "conserva"], tinned: ["lata", "conserva"], frozen: ["congelado", "congelada"], fresh: ["fresco", "fresca"],
  // vegetables
  vegetable: ["verdura", "hortaliza"], veggie: ["verdura", "hortaliza"], potato: ["patata"], tomato: ["tomate"], onion: ["cebolla"], garlic: ["ajo"],
  carrot: ["zanahoria"], lettuce: ["lechuga"], spinach: ["espinaca"], broccoli: ["brocoli"], cauliflower: ["coliflor"], cucumber: ["pepino"],
  pepper: ["pimiento", "pimienta"], zucchini: ["calabacin"], courgette: ["calabacin"], eggplant: ["berenjena"], aubergine: ["berenjena"],
  pumpkin: ["calabaza"], mushroom: ["champinon", "seta", "champi"], pea: ["guisante"], bean: ["judia", "alubia", "haba", "frijol"],
  lentil: ["lenteja"], chickpea: ["garbanzo"], legume: ["legumbre"], cabbage: ["col$", "repollo"], leek: ["puerro"], celery: ["apio"],
  asparagus: ["esparrago"], artichoke: ["alcachofa"], beetroot: ["remolacha"], beet: ["remolacha"], radish: ["rabano"], avocado: ["aguacate"],
  olive: ["oliva", "aceituna"], pickle: ["pepinillo", "encurtido"], salad: ["ensalada"], soup: ["sopa", "crema", "caldo"], broth: ["caldo"], stock: ["caldo"],
  // fruit
  fruit: ["fruta"], apple: ["manzana"], banana: ["platano", "banana"], orange: ["naranja"], lemon: ["limon"], lime: ["lima$"], mandarin: ["mandarina", "clementina"],
  tangerine: ["mandarina", "clementina"], clementine: ["clementina", "mandarina"], grape: ["uva"], strawberry: ["fresa", "freson"], blueberry: ["arandano"],
  raspberry: ["frambuesa"], blackberry: ["mora$", "moras$"], cherry: ["cereza"], peach: ["melocoton"], nectarine: ["nectarina"], apricot: ["albaricoque"],
  plum: ["ciruela"], pear: ["pera$", "peras$"], pineapple: ["pina"], watermelon: ["sandia"], coconut: ["coco$", "coco"], fig: ["higo"], date: ["datil"],
  pomegranate: ["granada$"], grapefruit: ["pomelo"], juice: ["zumo"], smoothie: ["batido", "smoothie"],
  // drinks
  water: ["agua"], sparkling: ["gas", "burbuja"], soda: ["refresco", "cola"], beer: ["cerveza"], wine: ["vino"], red: ["rojo", "roja", "tinto"],
  white: ["blanco", "blanca"], green: ["verde"], black: ["negro", "negra"], dark: ["negro", "negra"], rose: ["rosado"], gin: ["ginebra"], rum: ["ron$"],
  energy: ["energetica", "energy"], coffee: ["cafe"], decaf: ["descafeinado"], tea: ["te$", "infusion"], herbal: ["infusion"], chamomile: ["manzanilla"],
  // oils, sauces, spices
  oil: ["aceite"], vinegar: ["vinagre"], salt: ["sal$"], sauce: ["salsa"], mayonnaise: ["mayonesa"], mayo: ["mayonesa"], mustard: ["mostaza"],
  ginger: ["jengibre"], cinnamon: ["canela"], vanilla: ["vainilla"], paprika: ["pimenton"], cumin: ["comino"], turmeric: ["curcuma"], saffron: ["azafran"],
  spice: ["especia"], herb: ["hierba"], parsley: ["perejil"], basil: ["albahaca"], coriander: ["cilantro", "culantro"], mint: ["menta", "hierbabuena"],
  // other
  sandwich: ["sandwich", "bocadillo"], wrap: ["wrap", "tortilla"], omelette: ["tortilla"], dumpling: ["empanadilla", "gyoza"], lasagna: ["lasana"],
  lasagne: ["lasana"], bar: ["barrita"], baby: ["bebe", "infantil"], salty: ["salado", "salada"], spicy: ["picante"], grated: ["rallado", "rallada"],
  jar: ["bote"], whey: ["whey", "proteina"], ready: ["preparado", "preparada"], meal: ["plato", "comida"],
};

/** Phrases that mean something different from their words. Each phrase is a list of groups; a product must match every group. */
export const PHRASES: Record<string, string[][]> = {
  "ice cream": [["helado"]],
  "sweet potato": [["boniato", "batata"]],
  "green bean": [["judia"], ["verde"]],
  "peanut butter": [["cacahuete"], ["mantequilla", "crema"]],
  "cream cheese": [["queso"], ["crema", "untar"]],
  "cottage cheese": [["requeson"]],
  "soy milk": [["soja"], ["bebida", "leche"]],
  "oat milk": [["avena"], ["bebida", "leche"]],
  "almond milk": [["almendra"], ["bebida", "leche"]],
  "rice milk": [["arroz"], ["bebida", "leche"]],
  "coconut milk": [["coco"], ["bebida", "leche"]],
  "potato chip": [["patata"], ["frita", "chip"]],
  "crisp": [["patata"], ["frita", "chip"]],
  "french fry": [["patata"], ["frita"]],
  "fry": [["patata"], ["frita"]],
  "hot dog": [["frankfurt", "salchicha"]],
  "sparkling water": [["agua"], ["gas"]],
  "whole wheat": [["integral"]],
  "whole grain": [["integral"]],
  "wholemeal": [["integral"]],
  "baking powder": [["levadura"]],
  "bell pepper": [["pimiento"]],
  "brown sugar": [["azucar"], ["moreno"]],
};
