// Shared category vocabulary used by the search UI and translated to each
// provider's native taxonomy (Google Places `type`, OSM tags).

export interface CategoryDef {
  id: string;
  label: string;
  /** Google Places `type` value, see https://developers.google.com/maps/documentation/places/web-service/supported_types */
  googleType?: string;
  /** Free-text sent as Places `keyword`/text query when no exact type exists. */
  googleKeyword?: string;
  /** OSM tag pairs, tried in order until one returns results. */
  osmTags: { key: string; value: string }[];
}

export const CATEGORIES: CategoryDef[] = [
  { id: "plumber", label: "Plumbers", googleType: "plumber", osmTags: [{ key: "craft", value: "plumber" }] },
  { id: "electrician", label: "Electricians", googleType: "electrician", osmTags: [{ key: "craft", value: "electrician" }] },
  { id: "dentist", label: "Dentists", googleType: "dentist", osmTags: [{ key: "amenity", value: "dentist" }] },
  { id: "doctor", label: "Doctors / GPs", googleType: "doctor", osmTags: [{ key: "amenity", value: "doctors" }] },
  { id: "lawyer", label: "Lawyers / Attorneys", googleType: "lawyer", osmTags: [{ key: "office", value: "lawyer" }] },
  { id: "accountant", label: "Accountants", googleType: "accounting", osmTags: [{ key: "office", value: "accountant" }] },
  { id: "restaurant", label: "Restaurants", googleType: "restaurant", osmTags: [{ key: "amenity", value: "restaurant" }] },
  { id: "cafe", label: "Cafés & Coffee Shops", googleType: "cafe", osmTags: [{ key: "amenity", value: "cafe" }] },
  { id: "bakery", label: "Bakeries", googleType: "bakery", osmTags: [{ key: "shop", value: "bakery" }] },
  { id: "hair_salon", label: "Hair Salons", googleType: "hair_care", osmTags: [{ key: "shop", value: "hairdresser" }] },
  { id: "beauty_salon", label: "Beauty & Nail Salons", googleType: "beauty_salon", osmTags: [{ key: "shop", value: "beauty" }] },
  { id: "gym", label: "Gyms & Fitness Studios", googleType: "gym", osmTags: [{ key: "leisure", value: "fitness_centre" }] },
  { id: "physiotherapist", label: "Physiotherapists", googleType: "physiotherapist", osmTags: [{ key: "healthcare", value: "physiotherapist" }] },
  { id: "veterinary", label: "Veterinarians", googleType: "veterinary_care", osmTags: [{ key: "amenity", value: "veterinary" }] },
  { id: "real_estate", label: "Real Estate Agents", googleType: "real_estate_agency", osmTags: [{ key: "office", value: "estate_agent" }] },
  { id: "car_repair", label: "Car Repair / Mechanics", googleType: "car_repair", osmTags: [{ key: "shop", value: "car_repair" }] },
  { id: "architect", label: "Architects", googleKeyword: "architect", osmTags: [{ key: "office", value: "architect" }] },
  { id: "photographer", label: "Photographers", googleKeyword: "photographer", osmTags: [{ key: "shop", value: "photo" }, { key: "craft", value: "photographer" }] },
  { id: "florist", label: "Florists", googleType: "florist", osmTags: [{ key: "shop", value: "florist" }] },
  { id: "pet_groomer", label: "Pet Groomers", googleKeyword: "pet groomer", osmTags: [{ key: "shop", value: "pet_grooming" }] },
  { id: "driving_school", label: "Driving Schools", googleKeyword: "driving school", osmTags: [{ key: "amenity", value: "driving_school" }] },
  { id: "cleaning_service", label: "Cleaning Services", googleKeyword: "cleaning service", osmTags: [{ key: "office", value: "cleaning" }] },
  { id: "guest_house", label: "Guest Houses & B&Bs", googleType: "lodging", osmTags: [{ key: "tourism", value: "guest_house" }] },
  { id: "wedding_venue", label: "Wedding Venues", googleKeyword: "wedding venue", osmTags: [{ key: "amenity", value: "events_venue" }] },
  { id: "caterer", label: "Caterers", googleKeyword: "catering", osmTags: [{ key: "shop", value: "catering" }] },
  { id: "insurance_broker", label: "Insurance Brokers", googleType: "insurance_agency", osmTags: [{ key: "office", value: "insurance" }] },
  { id: "travel_agency", label: "Travel Agencies", googleType: "travel_agency", osmTags: [{ key: "shop", value: "travel_agency" }] },
  { id: "furniture_store", label: "Furniture Stores", googleType: "furniture_store", osmTags: [{ key: "shop", value: "furniture" }] },
  { id: "butchery", label: "Butcheries", googleKeyword: "butchery", osmTags: [{ key: "shop", value: "butcher" }] },
  { id: "hardware_store", label: "Hardware Stores", googleType: "hardware_store", osmTags: [{ key: "shop", value: "hardware" }] },
  { id: "landscaper", label: "Landscapers / Gardening", googleKeyword: "landscaping", osmTags: [{ key: "craft", value: "gardener" }] },
  { id: "security_company", label: "Security Companies", googleKeyword: "security company", osmTags: [{ key: "office", value: "security" }] },
];

export function findCategory(idOrLabel: string): CategoryDef | undefined {
  const needle = idOrLabel.trim().toLowerCase();
  return CATEGORIES.find(
    (c) => c.id === needle || c.label.toLowerCase() === needle || c.label.toLowerCase().includes(needle),
  );
}
