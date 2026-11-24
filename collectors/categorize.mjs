// Sorts lots into categories and types (subcategories) from their titles.
// Categories are checked in PRIORITY order (more specific first); the site lists them in DISPLAY order.
// Run `node scripts/gen-taxonomy.mjs` after editing labels so the website picks them up.

const w = (...parts) => new RegExp(`\\b(?:${parts.join("|")})\\b`, "i");

const YEAR_MAKE = "(?:19[5-9]\\d|20[0-3]\\d)\\s+(?:ford|chevrolet|chevy|dodge|toyota|honda|nissan|hyundai|kia|jeep|chrysler|buick|cadillac|gmc|lincoln|mercury|subaru|mazda|volkswagen|vw|audi|bmw|mercedes(?:-benz)?|lexus|acura|infiniti|volvo|tesla|mitsubishi|saturn|pontiac|ram|land rover|mini)";
const BOAT_MAKES = "sea ?ray|boston whaler|grady[- ]white|bayliner|carolina skiff|sea ?ark|munson|silver ships|safe boats?|metal shark|lund boats?|tracker marine|alumacraft|mako boats?|sea hunt|robalo|angler boats?|\\d{4} angler|wellcraft|chaparral|sea fox|scout boats?|privateer|yellowfin|zodiac|achilles|lowe boats?|g3 boats?|xpress boats?|war eagle";

// [key, label, category patterns, [[subKey, subLabel, patterns], ...]]
// A lot gets the first type whose pattern matches; otherwise the category's last type.
export const TAXONOMY = [
  ["aircraft", "Aircraft & parts", [w("aircraft", "jet aircra\\w*", "phenom", "airplanes?", "helicopters?", "airframes?", "black ?hawk", "jayhawk", "uh-?60", "hh-?60", "mh-?65", "piper", "cessna", "beechcraft", "avionics", "aircraft propellers?", "aviation", "t-?56")], [
    ["airplanes", "Airplanes", [w("piper", "cessna", "beechcraft", "airplanes?", "nc\\d{3,}")]],
    ["helicopters", "Helicopters", [w("helicopters?", "black ?hawk", "jayhawk", "uh-?60", "hh-?60", "mh-?65", "sikorsky")]],
    ["aircraft-parts", "Parts, engines & tools", [/./]],
  ]],
  ["emergency", "Fire, EMS & police gear", [w("ambulances?", "fire ?trucks?", "fire ?engines?", "pumpers?", "ladder ?trucks?", "aerial ladder", "fire ?apparatus", "e-one", "pierce", "american la ?france", "engine ?tanker", "engine/rescue", "rescue (?:truck|unit|squad|pumper)", "\\d{4} .{0,30}\\brescue\\b", "firefighting", "fire ?fighting", "scba", "turnout gear", "fire ?hose", "stream tip", "nozzles?", "lights? (?:&|and) sirens?", "light ?bars?", "sirens?", "road rescue", "medix", "wheeled coach", "horton")], [
    ["ambulances", "Ambulances", [w("ambulances?", "road rescue", "medix", "wheeled coach", "horton")]],
    ["fire-trucks", "Fire trucks", [w("fire ?trucks?", "fire ?engines?", "pumpers?", "ladder ?trucks?", "aerial ladder", "fire ?apparatus", "e-one", "pierce", "american la ?france", "engine ?tanker", "engine/rescue", "rescue")]],
    ["lights-sirens", "Lights & sirens", [w("lights? (?:&|and) sirens?", "light ?bars?", "sirens?")]],
    ["fire-gear", "Firefighting & rescue gear", [/./]],
  ]],
  ["boats", "Boats & marine", [w("boats?", "(?<!pressure )vessels?", "outboards?", "pontoons?", "skiffs?", "jon ?boats?", "center ?console", "bay ?boat", "personal watercraft", "pwc", "jet ?skis?", "wave ?runners?", "sea-?doo", "kayaks?", "canoes?", "paddle ?boards?", "barges?", "tug ?boats?", "sail ?boats?", "sailboats?", "yachts?", "inflatable boat", "rib boat", "hovercraft", "trolling motors?", "boat ?lifts?", "floating docks?", "boat docks?", "dock sections?", "buoys?", "life ?jackets?", "pfds?", "marine (?:engines?|motors?|electronics|radios?|batter(?:y|ies)|parts|supplies)", "(?:mercury|yamaha|evinrude|johnson|suzuki|tohatsu|honda)\\s+\\d{2,3}\\s*hp", "\\d{2,3}\\s*hp\\s+(?:mercury|yamaha|evinrude|johnson|suzuki|tohatsu)", "outboard", "outdrives?", "sterndrives?", "mercruiser", "volvo penta", "(?:mercury|yamaha|evinrude|johnson|suzuki|tohatsu) (?:engines?|motors?)", "marine antennas?", "cabin cruisers?", "(?<!(?:police|patrol|land|pt|squad|harley|road) )cruisers?(?!\\s+(?:\\d-door|4-door|sedan|suv|motorcycle))", "trawlers?", "catamarans?", "houseboats?", "mooring(?: lines?| balls?)?", "\\d{2,3} ?c?x{1,2}l engines?", "fish ?finders?", "chartplotters?", "lowrance", "humminbird", "garmin (?:echo|striker|gpsmap|echomap)", BOAT_MAKES)], [
    ["boat-trailers", "Boat trailers", [w("boat ?trailers?", "pontoon ?trailers?", "jet ?ski trailers?", "pwc trailers?")]],
    ["pwc", "Jet skis & PWC", [w("personal watercraft", "pwc", "jet ?skis?", "wave ?runners?", "sea-?doo")]],
    ["pontoons", "Pontoons", [w("pontoons?")]],
    ["kayaks", "Kayaks, canoes & paddle", [w("kayaks?", "canoes?", "paddle ?boards?")]],
    ["boats", "Boats", [w("boats?", "(?<!pressure )vessels?", "cabin cruisers?", "(?<!(?:police|patrol|land|pt|squad|harley|road) )cruisers?(?!\\s+(?:\\d-door|4-door|sedan|suv|motorcycle))", "trawlers?", "catamarans?", "houseboats?", "skiffs?", "jon ?boats?", "center ?console", "bay ?boat", "barges?", "tug ?boats?", "sail ?boats?", "sailboats?", "yachts?", "inflatable boat", "rib boat", "hovercraft", "\\d{1,3}\\s*(?:'|ft|foot|feet)\\b", BOAT_MAKES)]],
    ["outboards", "Outboards & engines", [w("outboards?", "\\d{2,3} ?c?x{1,2}l engines?", "outdrives?", "sterndrives?", "mercruiser", "volvo penta", "(?:mercury|yamaha|evinrude|johnson|suzuki|tohatsu) (?:engines?|motors?)", "trolling motors?", "marine (?:engines?|motors?)", "(?:mercury|yamaha|evinrude|johnson|suzuki|tohatsu|honda)\\s+\\d{2,3}\\s*hp", "\\d{2,3}\\s*hp\\s+(?:mercury|yamaha|evinrude|johnson|suzuki|tohatsu)", "lower units?")]],
    ["docks", "Docks, lifts & buoys", [w("mooring(?: lines?| balls?)?", "boat ?lifts?", "floating docks?", "boat docks?", "dock sections?", "docks?", "buoys?", "anchors?")]],
    ["marine-parts", "Marine electronics & gear", [/./]],
  ]],
  ["recreation", "Fitness, music & recreation", [w("fitness", "exercise", "treadmills?", "ellipticals?", "arc trainer", "rowing machines?", "gym", "weight ?bench", "crunch bench", "dumbbells?", "nautilus", "cybex", "nordic ?track", "pianos?", "clavinova", "(?:electric|digital) keyboards?", "guitars?", "drum ?sets?", "band instruments?", "musical instruments?", "golf (?:bags?|clubs?)", "sports? equipment", "indoor sports", "outdoor sports", "camping", "sleeping (?:mats?|bags?)", "tents?", "playground", "bleachers?", "basketball", "pool table", "bee ?hives?", "apiar\\w*", "pool (?:care|bundle|cleaner)", "telescopes?", "planters?", "holiday", "decorations?", "tiki", "aviary", "strollers?", "model railroad", "sports cards", "organs?")], [
    ["fitness", "Fitness equipment", [w("fitness", "exercise", "treadmills?", "ellipticals?", "arc trainer", "rowing machines?", "gym", "weight ?bench", "crunch bench", "dumbbells?", "nautilus", "cybex", "nordic ?track")]],
    ["music", "Musical instruments", [w("pianos?", "clavinova", "(?:electric|digital) keyboards?", "guitars?", "drum ?sets?", "band instruments?", "musical instruments?")]],
    ["sports", "Sports & camping", [/./]],
  ]],
  ["buses", "Buses", [w("bus(?:es)?", "school ?bus", "shuttles?", "coach(?:es)?", "paratransit", "transit bus", "motor ?coach")], [
    ["school-buses", "School buses", [w("school ?bus(?:es)?", "blue ?bird", "thomas built")]],
    ["coaches", "Coaches", [w("coach(?:es)?", "motor ?coach", "mci", "prevost")]],
    ["shuttles", "Shuttle & transit", [/./]],
  ]],
  ["powersports", "Golf carts & powersports", [w("golf ?carts?", "golf ?cars?", "club ?car", "e-?z-?go", "yard ?carts?", "carryall", "utility ?carts?", "atvs?", "utvs?", "side[- ]by[- ]side", "polaris", "kawasaki mule", "mule", "gator", "rtv", "can-?am", "arctic ?cat", "snow ?mobiles?", "ski-?doo", "motorcycles?", "harley", "dirt ?bikes?", "scooters?", "mopeds?", "e-?bikes?", "bicycles?", "bikes?", "segway")], [
    ["golf-carts", "Golf carts", [w("golf ?carts?", "golf ?cars?", "club ?car", "e-?z-?go", "yard ?carts?", "carryall")]],
    ["atv-utv", "ATVs & UTVs", [w("atvs?", "utvs?", "side[- ]by[- ]side", "polaris", "kawasaki mule", "mule", "gator", "rtv", "can-?am", "utility ?carts?")]],
    ["snowmobiles", "Snowmobiles", [w("snow ?mobiles?", "ski-?doo", "arctic ?cat")]],
    ["motorcycles", "Motorcycles", [w("motorcycles?", "harley", "dirt ?bikes?")]],
    ["bikes", "Bikes & scooters", [/./]],
  ]],
  ["trucks", "Trucks & vans", [w("(?<!hand |pallet |platform )trucks?", "pickups?", "dump trucks?", "tractor ?trailer", "semi(?: |-)?(?:trucks?|tractors?)", "f-?(?:150|250|350|450|550|650|750)", "silverado", "sierra", "ram\\s*\\d{4}", "(?:chevrolet|chevy|gmc|ram)\\s+[23]500(?:hd)?", "\\b[23]500 ?hd", "tacoma", "tundra", "frontier", "colorado", "canyon", "ford ranger", "crew ?cab", "box ?van", "cargo ?van", "vans?", "e-?(?:250|350|450)", "transit", "sprinter", "savana", "express \\d{4}", "freightliner", "kenworth", "peterbilt", "mack", "western star", "international\\s+(?:\\d{4}|durastar|workstar|prostar)", "ln\\s?\\d{4}", "wreckers?", "tow ?trucks?", "rollbacks?", "oshkosh", "hemtt", "humvees?", "hmmwv", "lmtv", "m35", "bucket ?trucks?", "digger ?derricks?", "chassis cab", "cab ?& ?chassis", "sterling", "autocar", "kodiak", "auto parts", "\\d+ ?yard dump", "dump(?! trailers?)", "(?:dodge|gmc|chevrolet|chevy|ford)\\s+[cdkw]-?\\d{2,4}", "c\\d500", "tires?", "rims")], [
    ["pickups", "Pickups", [w("pickups?", "f-?(?:150|250|350)", "silverado", "sierra", "ram\\s*\\d{4}", "(?:chevrolet|chevy|gmc|ram)\\s+[23]500(?:hd)?", "[23]500 ?hd", "tacoma", "tundra", "frontier", "colorado", "canyon", "ford ranger", "crew ?cab")]],
    ["bucket-utility", "Bucket & utility trucks", [w("bucket ?trucks?", "aerial (?:lift|device)", "digger ?derricks?", "utility (?:body|bed|truck)", "boom truck", "altec", "terex")]],
    ["dump-trucks", "Dump trucks", [w("dump(?! trailers?)")]],
    ["plow-sweeper", "Plow, sander & sweeper trucks", [w("plow", "sanders?", "spreaders?", "sweeper", "snow ?plow")]],
    ["tires-parts", "Tires & truck parts", [w("tires?", "rims", "truck parts", "auto parts", "tailgates?", "truck beds?", "toolboxes?", "storage boxes", "core/engine", "seats from")]],
    ["garbage", "Garbage & roll-off", [w("refuse", "garbage", "packers?", "roll-?off", "sanitation", "recycling truck")]],
    ["wreckers", "Wreckers & rollbacks", [w("wreckers?", "tow ?trucks?", "rollbacks?")]],
    ["tankers", "Tankers & water trucks", [w("tankers?", "water ?trucks?", "fuel ?trucks?", "vac(?:uum)? ?trucks?", "vactor", "jetter")]],
    ["semis", "Semis & tractors", [w("semi(?: |-)?(?:trucks?|tractors?)", "tractor ?trailer", "tractor truck", "truck tractor", "t/a truck", "day ?cab", "sleeper", "kenworth", "peterbilt", "western star", "cascadia", "prostar")]],
    ["military", "Military trucks", [w("hemtt", "humvees?", "hmmwv", "lmtv", "m35", "m9\\d{2}", "oshkosh m")]],
    ["vans", "Vans", [w("vans?", "e-?(?:250|350|450)", "transit", "sprinter", "savana", "express \\d{4}", "promaster")]],
    ["box-trucks", "Service, box & flatbed trucks", [w("service (?:truck|box|body)", "mechanics", "rack body", "reefer", "box ?(?:truck|van)", "cargo ?van", "flatbed", "stake ?bed", "service ?body", "chassis cab", "cab ?& ?chassis")]],
    ["work-trucks", "Other work trucks", [/./]],
  ]],
  ["cars", "Cars & SUVs", [w("sedans?", "suvs?", "coupes?", "hatchbacks?", "automobiles?", "(?<!golf |rail |push )cars?", "ford taurus", "impala", "camry", "corolla", "ford fusion", "(?:chevrolet|chevy) malibu", "ford explorer", "expedition", "tahoe", "(?:chevrolet|chevy) suburban", "yukon", "durango", "dodge charger", "crown ?victoria", "prius", "altima", "honda civic", "honda accord", "ford escape", "equinox", "traverse", "cherokee", "wrangler", "jeep", "ford edge", "honda pilot", "rav4", "highlander", "venza", "4runner", "caravan", "minivan", "odyssey", "sienna", "pacifica", "interceptor", "police (?:car|vehicle|package|interceptor)", "ppv", "hhr", "trailblazer", "q7", YEAR_MAKE)], [
    ["police", "Former police vehicles", [w("police", "interceptor", "ppv", "pursuit", "k-?9", "crown ?victoria", "sheriff")]],
    ["minivans", "Minivans", [w("caravan", "minivan", "odyssey", "sienna", "pacifica", "quest", "town (?:&|and) country")]],
    ["suvs", "SUVs", [w("suvs?", "explorer", "expedition", "tahoe", "suburban", "yukon", "durango", "escape", "equinox", "traverse", "cherokee", "wrangler", "jeep", "ford edge", "pilot", "rav4", "highlander", "venza", "4runner", "trailblazer", "q7", "x5", "rx ?\\d{3}", "cr-?v", "rogue", "pathfinder", "4x4 suv", "blazer", "bronco", "escalade", "navigator", "envoy", "terrain", "acadia", "enclave")]],
    ["ev-hybrid", "Electric & hybrid", [w("prius", "hybrid", "electric vehicle", "bolt", "leaf", "tesla", "ev")]],
    ["sedans", "Sedans & other cars", [/./]],
  ]],
  ["medical", "Medical & lab", [w("medical", "hospital", "patients?", "stretchers?", "wheelchairs?", "ventilators?", "bipaps?", "oxygen", "defibrillators?", "aeds?", "ophthalm\\w*", "optometry", "exam (?:chairs?|tables?)", "dental", "x-?ray", "ultrasound", "surgical", "endoscopes?", "infusion", "feeding", "balloon pump", "hemodynamic", "cath lab", "isoflurane", "vaporizers?", "pachymeters?", "dilator", "laboratory", "lab (?:equipment|oven|freezer|bench)", "microscopes?", "stereoscope", "chromatograph\\w*", "spectromet\\w*", "icp-?ms", "centrifuges?", "pipett\\w*", "dna sequencers?", "chemistry", "fluoromet\\w*", "manometers?", "tribometer", "bariatric", "drager", "stryker", "atomic absorp\\w*", "perkin ?elmer", "lasers?", "quanta-?ray", "manikins?", "simulators?", "nmr", "cryomagnet", "water bath", "particle counters?", "petri", "pcr", "lensometers?", "phoropters?", "oximeters?", "laryngoscopes?", "physical therapy", "cough assist", "lc/ms", "ftir", "cuvette")], [
    ["lab", "Lab & scientific", [w("laboratory", "lab (?:equipment|oven|freezer|bench)", "microscopes?", "stereoscope", "chromatograph\\w*", "spectromet\\w*", "icp-?ms", "centrifuges?", "pipett\\w*", "dna sequencers?", "chemistry", "fluoromet\\w*", "manometers?", "tribometer", "atomic absorp\\w*", "perkin ?elmer", "lasers?", "quanta-?ray")]],
    ["medical-equipment", "Medical equipment", [/./]],
  ]],
  ["equipment", "Heavy equipment", [w("excavators?", "backhoes?", "loaders?", "bulldozers?", "dozers?", "skid ?steers?", "graders?", "rollers?", "pavers?", "pathmaster", "asphalt", "crack (?:sealer|router)", "tack tank", "tar kettles?", "forklifts?", "pallet ?jacks?", "telehandlers?", "cranes?", "boom ?lifts?", "scissor ?lifts?", "man ?lifts?", "aerial lifts?", "tractors?", "brush ?hogs?", "bush ?hogs?", "farm equipment", "hay", "implements?", "mowers?", "zero ?turns?", "aerators?", "hydroseeders?", "(?:wood ?)?chippers?", "woodchippers?", "stump grinders?", "trenchers?", "landscaping", "snow ?plows?", "snow ?blowers?", "salt ?spreaders?", "spreaders?", "snow ?pushers?", "(?:tailgate|v-?box|salt) sanders?", "sweepers?", "floor ?scrubbers?", "auto ?scrubbers?", "generators?", "compressors?", "light ?towers?", "pumps?", "heavy equipment", "attachments?", "buckets?", "tillers?", "roto-?tillers?", "cultivators?", "discs?", "no-till", "seeders?", "spray(?:ers?| star| units?)", "turf", "aerway", "bunker rake", "ventrac", "smithco", "husqvarna", "leaf vac\\w*", "screeners?", "air movers?", "generac", "transfer switch\\w*", "plows?", "3-point", "pto", "post hole digger", "tampers?", "compactors?", "wacker", "hoists?", "gradall", "(?:john deere?|cat|case|komatsu|jcb) \\d{3,4}[a-z]{0,2}", "lawn ?mowers?", "lawnmowers?", "trimmers?", "leaf blowers?", "(?<!snow )blowers?", "edgers?", "stihl", "echo (?:model|pb|srm|cs|ppt)", "vermeer", "bobcat", "kubota", "john deere", "caterpillar", "cat \\d{3}", "case \\d{3}", "leeboy", "dynapac", "dyna pac", "wolf pac", "crafco", "tennant", "toro", "exmark", "hustler", "scag")], [
    ["excavators", "Excavators", [w("excavators?", "trackhoes?", "mini ?ex")]],
    ["loaders-backhoes", "Loaders & backhoes", [w("backhoes?", "loaders?")]],
    ["skid-steers", "Skid steers", [w("skid ?steers?", "track loaders?", "bobcat s\\d+")]],
    ["dozers-graders", "Dozers & graders", [w("bulldozers?", "dozers?", "graders?")]],
    ["paving", "Rollers, pavers & asphalt", [w("rollers?", "pavers?", "pathmaster", "asphalt", "crack (?:sealer|router)", "tack tank", "tar kettles?", "dynapac", "dyna pac", "wolf pac", "crafco")]],
    ["forklifts", "Forklifts & pallet jacks", [w("forklifts?", "pallet ?jacks?", "telehandlers?")]],
    ["lifts-cranes", "Cranes & lifts", [w("cranes?", "boom ?lifts?", "scissor ?lifts?", "man ?lifts?", "aerial lifts?")]],
    ["snow", "Snow & ice", [w("snow ?plows?", "plows?", "snow ?blowers?", "salt ?spreaders?", "snow ?pushers?", "(?:tailgate|v-?box|salt) sanders?", "spreaders?")]],
    ["mowers", "Mowers & landscaping", [w("mowers?", "husqvarna", "leaf vac\\w*", "screeners?", "zero ?turns?", "aerators?", "hydroseeders?", "(?:wood ?)?chippers?", "woodchippers?", "stump grinders?", "trenchers?", "landscaping", "toro", "exmark", "hustler", "scag", "lawn ?mowers?", "trimmers?", "leaf blowers?", "blowers?", "edgers?", "stihl", "echo", "hedge")]],
    ["tractors", "Tractors & farm", [w("tractors?", "brush ?hogs?", "bush ?hogs?", "farm equipment", "hay", "implements?")]],
    ["sweepers", "Sweepers & scrubbers", [w("sweepers?", "floor ?scrubbers?", "auto ?scrubbers?", "tennant")]],
    ["power", "Generators, compressors & pumps", [w("generators?", "generac", "transfer switch\\w*", "air movers?", "compressors?", "light ?towers?", "pumps?")]],
    ["farm-turf", "Farm & turf equipment", [w("tillers?", "roto-?tillers?", "cultivators?", "discs?", "no-till", "seeders?", "spray(?:ers?| star| units?)", "turf", "aerway", "bunker rake", "ventrac", "smithco", "3-point", "pto", "post hole digger")]],
    ["compaction", "Compactors & tampers", [w("tampers?", "compactors?", "wacker")]],
    ["attachments", "Attachments & parts", [w("attachments?", "buckets?", "forks", "blades?", "hoists?")]],
    ["other-equipment", "Other equipment", [/./]],
  ]],
  ["trailers", "Trailers & campers", [w("trailers?", "trai\\.\\.\\.", "\\d{1,2} ?x ?\\d{1,2}\\b.{0,12}(?:enclosed|utility|equipment|cargo|dump|flatbed)", "lowboys?", "campers?", "travel trailers?", "fifth wheel", "rvs?", "motorhomes?", "toy ?haulers?", "message boards?", "arrow boards?")], [
    ["campers", "Campers & RVs", [w("campers?", "travel trailers?", "fifth wheel", "rvs?", "motorhomes?", "toy ?haulers?")]],
    ["equipment-trailers", "Equipment & lowboy", [w("lowboys?", "equipment trailers?", "tilt (?:deck|trailer)", "gooseneck")]],
    ["enclosed", "Enclosed & cargo", [w("enclosed", "cargo trailers?", "concession", "office trailers?")]],
    ["sign-boards", "Message & arrow boards", [w("message boards?", "arrow boards?", "sign boards?")]],
    ["utility-trailers", "Utility & flatbed", [/./]],
  ]],
  ["kitchen", "Kitchen & appliances", [w("kitchen", "refrigerators?", "freezers?", "fridges?", "ovens?", "microwaves?", "(?:gas|electric|commercial) ranges?", "fryers?", "griddles?", "dishwashers?", "ice (?:machines?|makers?|shavers?)", "warmers?", "warming cabinets?", "heat cabinet", "braising pans?", "steam tables?", "chafers?", "food (?:service|warmers?|processors?)", "reach-?in", "walk-?in", "coolers?", "(?<!pressure |power )washers?", "(?<!air )dryers?", "appliances?", "grills?", "combi oven", "hobart", "follett", "rational", "stoves?", "char-?broil\\w*", "charb\\w*", "salad bars?", "sinks?", "food storage", "ice cream", "sheet pans?", "dishwasher (?:racks?|station)", "tray dispensers?", "mixers?", "slicers?", "choppers?", "vulcan", "garland", "duke", "combi", "blodgett", "kettles?", "tilt skillet", "dough", "serving counter", "beverage air", "coffee makers?")], [
    ["refrigeration", "Refrigeration", [w("refrigerators?", "freezers?", "fridges?", "ice (?:machines?|makers?)", "reach-?in", "walk-?in", "coolers?", "follett")]],
    ["appliances", "Home appliances", [w("(?<!pressure |power )washers?", "dryers?", "appliances?", "dishwashers?", "microwaves?")]],
    ["commercial-kitchen", "Commercial kitchen", [/./]],
  ]],
  ["electronics", "Computers & electronics", [w("computers?", "laptops?", "notebooks?", "desktops?", "monitors?", "printers?", "toner", "copiers?", "scanners?", "servers?", "network\\w*", "switch(?:es)?", "routers?", "nas", "phones?", "radios?", "two-?way", "motorola", "projectors?", "cameras?", "televisions?", "tvs?", "tablets?", "ipads?", "audio", "speakers?", "audio/visual", "a/v", "oscilloscopes?", "test (?:equipment|system|oscillator|gauges?)", "testing measurement", "analyzers?", "electronic", "telecom\\w*", "cisco", "dell", "hp (?:printers?|laptops?|computers?|laserjet|toner|\\d+x)", "lexmark", "zebra printers?", "imaging kit", "fax", "ups batter(?:y|ies)", "avaya", "webex", "synology", "tektronix", "fluke", "time clocks?", "plotters?", "vinyl cutters?")], [
    ["computers", "Computers & laptops", [w("computers?", "laptops?", "notebooks?", "desktops?", "monitors?", "tablets?", "ipads?", "dell latitude", "macbooks?")]],
    ["printers", "Printers, copiers & toner", [w("printers?", "plotters?", "vinyl cutters?", "toner", "copiers?", "scanners?", "imaging kit", "transfer kits?", "fax", "cartridges?", "lexmark", "laserjet")]],
    ["networking", "Networking & servers", [w("servers?", "network\\w*", "switch(?:es)?", "routers?", "nas", "cisco", "synology", "cables?")]],
    ["radios-phones", "Radios & phones", [w("phones?", "radios?", "two-?way", "motorola", "avaya", "telecom\\w*")]],
    ["av-cameras", "Cameras & AV", [w("projectors?", "cameras?", "televisions?", "tvs?", "audio", "speakers?", "audio/visual", "a/v", "webex", "screens?")]],
    ["test", "Test & measurement", [/./]],
  ]],
  ["tools", "Tools & shop", [w("tools?", "welders?", "welding", "saws?", "drill press", "lathes?", "jointers?", "grinders?", "pressure washers?", "steam cleaners?", "carpet cleaning", "parts wash\\w*", "floor jacks?", "jack stands?", "tire (?:machines?|changers?)", "wheel alignment", "balancers?", "vehicle lifts?", "car lifts?", "shop (?:equipment|supplies|accessories)", "pneumatic", "air tools?", "wrench(?:es)?", "sockets?", "tool ?box(?:es)?", "harness(?:es)?", "safety (?:gear|harness)", "janitorial", "ladders?", "metal shear", "shears?", "knee mill", "toolroom", "cnc", "line borer", "planers?", "creepers?", "power washers?", "punch press", "hack ?saw", "extrication", "jaws of life", "lincoln mp", "dialarc", "miller (?:dialarc|bobcat|syncrowave|millermatic)", "powermatic", "black (?:&|and) decker", "dewalt", "milwaukee", "snap-?on")], [
    ["welders", "Welders", [w("welders?", "welding", "lincoln mp", "dialarc", "miller (?:dialarc|bobcat|syncrowave|millermatic)")]],
    ["woodworking", "Woodworking & machining", [w("lathes?", "knee mill", "toolroom", "cnc", "line borer", "planers?", "metal shear", "shears?", "punch press", "jointers?", "drill press", "radial arm saw", "table saws?", "band saws?", "powermatic", "mills?")]],
    ["auto-shop", "Automotive shop", [w("floor jacks?", "jack stands?", "tire (?:machines?|changers?)", "wheel alignment", "balancers?", "vehicle lifts?", "car lifts?", "parts wash\\w*")]],
    ["cleaning", "Pressure washers & cleaning", [w("pressure washers?", "power washers?", "floor buffers?", "vacuums?", "steam cleaners?", "carpet cleaning", "janitorial", "cleaning")]],
    ["safety", "Safety gear", [w("harness(?:es)?", "safety (?:gear|harness)", "helmets?", "respirators?", "knee pads")]],
    ["hand-power-tools", "Power & hand tools", [/./]],
  ]],
  ["furniture", "Office & furniture", [w("furniture", "desks?", "chairs?", "tables?", "file cabinets?", "filing cabinets?", "cabinets?", "book ?shel(?:f|ves)", "shelv(?:es|ing)", "cubicles?", "dividers?", "lockers?", "safes?", "couch(?:es)?", "sofas?", "credenzas?", "bookcases?", "storage (?:units?|racks?)", "racks?", "office (?:supplies|furniture)", "herman miller", "steelcase", "hon", "carts?", "trays?", "whiteboards?", "display cases?")], [
    ["desks-tables", "Desks & tables", [w("desks?", "tables?", "credenzas?", "workstations?", "cubicles?")]],
    ["chairs", "Chairs & seating", [w("chairs?", "couch(?:es)?", "sofas?", "seating", "benches?")]],
    ["safes", "Safes", [w("safes?")]],
    ["storage", "Cabinets, shelving & storage", [w("file cabinets?", "filing cabinets?", "cabinets?", "book ?shel(?:f|ves)", "shelv(?:es|ing)", "lockers?", "bookcases?", "storage", "racks?")]],
    ["office", "Other office & furniture", [/./]],
  ]],
  ["industrial", "Industrial & warehouse", [w("conveyors?", "stock pickers?", "order pickers?", "totes?", "crates?", "pallets? racks?", "pallet racking", "hand trucks?", "dolly", "dollies", "press brakes?", "presses", "dust collectors?", "shrink (?:tunnel|wrap)", "vacuum machines?", "ginning", "robots?", "robotic", "scorbot", "industrial", "tanks?", "cisterns?", "drums?", "waste cans?", "hoses?", "batter(?:y|ies)", "lanterns?", "electrical supplies", "mats", "hvac", "duct kits?", "machinery", "machines?")], [
    ["material-handling", "Conveyors & material handling", [w("conveyors?", "stock pickers?", "order pickers?", "totes?", "crates?", "pallets? racks?", "pallet racking", "hand trucks?", "dolly", "dollies")]],
    ["machinery", "Machinery", [w("press brakes?", "presses", "dust collectors?", "shrink (?:tunnel|wrap)", "vacuum machines?", "ginning", "robots?", "robotic", "scorbot", "machinery", "machines?")]],
    ["tanks", "Tanks & containers", [w("tanks?", "cisterns?", "drums?", "waste cans?")]],
    ["supplies", "Industrial supplies", [/./]],
  ]],
  ["building", "Building & materials", [w("building materials?", "doors?", "windows?", "lumber", "plywood", "light fixtures?", "lighting", "flooring", "carpet tiles?", "tiles?", "roofing", "hvac", "air conditioners?", "boilers?", "water heaters?", "hydratherm", "wire", "cable", "fenc(?:e|es|ing)", "modular buildings?", "sheds?", "guard (?:shack|booth)", "security booth", "shipping containers?", "containers?", "signs?", "parking blocks?", "pipes?", "culverts?", "water meters?", "meters?", "hardware cloth", "steel", "water (?:&|and) sewer", "home improvement", "construction")], [
    ["doors-windows", "Doors & windows", [w("doors?", "windows?")]],
    ["lighting-electrical", "Lighting & electrical", [w("light fixtures?", "lighting", "wire", "cable", "electrical")]],
    ["plumbing-hvac", "Plumbing & HVAC", [w("hvac", "air conditioners?", "boilers?", "water heaters?", "hydratherm", "pipes?", "culverts?", "water meters?", "meters?", "water (?:&|and) sewer")]],
    ["buildings", "Buildings & containers", [w("modular buildings?", "sheds?", "guard (?:shack|booth)", "security booth", "shipping containers?", "containers?")]],
    ["fencing-signs", "Fencing & signs", [w("fenc(?:e|es|ing)", "signs?", "parking blocks?", "hardware cloth")]],
    ["materials", "Lumber & materials", [/./]],
  ]],
];

// Order used on the site: marine first, then vehicles and equipment, then everything else.
export const DISPLAY_ORDER = ["boats", "trucks", "cars", "equipment", "buses", "powersports", "trailers", "emergency", "aircraft", "tools", "industrial", "electronics", "kitchen", "medical", "furniture", "building", "recreation"];

// Old keys that are no longer used.
export const RENAMED = { "golf carts": "powersports" };

export const CATEGORIES = TAXONOMY.map(([key]) => key).concat("other");

// Matching order. Medical and heavy equipment go before cars so "Toyota forklift" isn't a car.
const PRIORITY = ["aircraft", "emergency", "boats", "recreation", "medical", "buses", "powersports", "trucks", "equipment", "cars", "trailers", "kitchen", "electronics", "tools", "furniture", "building", "industrial"];
const BY_KEY = Object.fromEntries(TAXONOMY.map((t) => [t[0], t]));

export function categorize(title = "", description = "") {
  const text = `${title} ${description}`;
  for (const key of PRIORITY) {
    if (BY_KEY[key][2].some((p) => p.test(text))) return key;
  }
  return "other";
}

export function subcategorize(category, title = "", description = "") {
  const entry = TAXONOMY.find(([key]) => key === category);
  if (!entry) return null;
  const subs = entry[3];
  for (const text of [title, `${title} ${(description ?? "").slice(0, 300)}`]) {
    for (const [subKey, , patterns] of subs.slice(0, -1)) {
      if (patterns.some((p) => p.test(text))) return subKey;
    }
  }
  return subs[subs.length - 1][0];
}

// Boat length in feet from a title like "22 ft Angler" or "2002 Angler 22'".
export function lengthFeet(title = "", description = "") {
  for (const text of [title, (description ?? "").slice(0, 400)]) {
    const m = text.match(/\b(\d{1,3}(?:\.\d)?)\s*(?:'|’|ft\b|feet\b|foot\b|-foot\b|-ft\b)/i);
    if (m) {
      const n = Number(m[1]);
      if (n >= 6 && n <= 200) return n;
    }
  }
  return null;
}

export function yearOf(title = "") {
  const m = title.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (!m) return null;
  const y = Number(m[1]);
  return y <= new Date().getFullYear() + 1 ? y : null;
}

// Fills in type, boat length and year for rows about to be saved.
export function enrich(row) {
  const category = RENAMED[row.category] ?? row.category;
  const out = { ...row, category, subcategory: subcategorize(category, row.title ?? "", row.description ?? "") };
  if (category === "boats") out.length_ft = lengthFeet(row.title ?? "", row.description ?? "");
  const y = yearOf(row.title ?? "");
  if (y && row.year == null && ["boats", "trucks", "cars", "buses", "powersports", "trailers", "emergency", "equipment", "aircraft"].includes(category)) out.year = y;
  return out;
}
