export interface SampleDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  text: string;
}

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: 'sample-honeybees',
    title: 'The Marvelous Language of Honeybees',
    category: 'Science & Nature',
    description: 'An engaging exploration of how worker bees communicate food locations using complex dances.',
    text: `Honeybees possess one of the most sophisticated communication systems in the animal kingdom. When a foraging bee discovers a rich patch of flowering clover or lavender, she returns to the dark hive to share the news with her sisters.

Instead of vocalizing, the bee performs what scientists call the "waggle dance." By moving in a figure-eight pattern and vigorously shaking her abdomen, she encodes two vital pieces of information: the exact angle of the flower patch relative to the sun, and the total distance required to fly.

The duration of the waggle run communicates distance. A one-second waggle signals that the nectar source is roughly one kilometer away. Meanwhile, the angle of the dance line points directly toward the food.

Astonishingly, bees also adjust their dance in real time to account for the sun moving across the afternoon sky. Other worker bees crowd around in the darkness, feeling the dancer's vibrations through their sensitive antennae before setting off on their flight.`,
  },
  {
    id: 'sample-sourdough',
    title: 'Beginner Guide to Baking Sourdough',
    category: 'Recipe & Cooking',
    description: 'Clear step-by-step instructions for crafting an artisanal loaf with wild yeast.',
    text: `Baking homemade sourdough bread requires patience, clean hands, and attention to subtle visual clues. Unlike commercial bread made with packaged dry yeast, sourdough relies on a living culture of wild yeasts and friendly lactic acid bacteria.

Step 1: Feeding Your Starter
Twelve hours before mixing your dough, feed your starter with equal parts unbleached flour and tepid filtered water. When the starter bubbles actively and doubles in volume, it is ready for baking.

Step 2: Mixing and Autolyse
In a wide mixing bowl, dissolve 100 grams of active starter in 350 grams of warm water. Add 500 grams of bread flour and mix by hand until no dry patches remain. Cover with a damp linen towel and let rest for forty minutes.

Step 3: Salt and Stretch-and-Fold
Sprinkle ten grams of fine sea salt over the relaxed dough with a splash of water. Rather than traditional kneading, perform four sets of stretch-and-folds every thirty minutes. Gently lift one side of the dough upwards and fold it across the center, rotating the bowl a quarter turn each time.`,
  },
  {
    id: 'sample-space-telescope',
    title: 'Peering Into Cosmic Dawn with Webb',
    category: 'Astronomy & Physics',
    description: 'Discover how gold-coated mirrors reveal the earliest galaxies formed after the Big Bang.',
    text: `Orbiting one million miles away from Earth in the frigid shadow of space, the James Webb Space Telescope acts as humanity's most powerful cosmic time machine. Its eighteen hexagonal beryllium mirrors, each coated with a microscopic layer of pure gold, collect faint infrared photons that have traveled across the universe for over thirteen billion years.

Because the universe is constantly expanding, ancient light waves from newborn stars have been stretched out over eons into long infrared wavelengths. Human eyes cannot see this invisible light, but Webb's cryogenic instruments detect the heat of these ancient cosmic embers with breathtaking precision.

By capturing the faint spectral signatures of early galaxies, astronomers can now analyze the chemical elements forged inside the universe's first generation of massive stars. These discoveries are reshaping our fundamental understanding of how cosmic dust condensed into solar systems, planets, and the organic molecules that eventually sparked life.`,
  },
  {
    id: 'sample-workplace',
    title: 'Team Collaboration & Flexible Hours Policy',
    category: 'Workplace & Guide',
    description: 'A standard workplace policy explaining communication norms and core working hours.',
    text: `Our company believes that high-performing teams thrive on trust, clear documentation, and respect for personal focus time. We support asynchronous communication so that team members across all time zones can complete meaningful deep work without constant message interruptions.

Core Collaboration Hours:
All full-time team members are expected to be available for synchronous meetings between 10:00 AM and 2:00 PM in their local regional time zone. Outside of these core hours, you may organize your working schedule in whichever manner best supports your productivity and personal well-being.

Meeting Guidelines:
1. Every calendar invitation must include a written agenda and clear decision objective at least twenty-four hours in advance.
2. If an update can be shared through a concise project document, default to written summary rather than scheduling a live meeting.
3. We encourage a company-wide "No Meeting Friday" to provide uninterrupted space for creative problem solving and weekly wrap-ups.`,
  },
];
