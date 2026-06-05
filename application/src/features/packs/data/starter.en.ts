import { type Pack } from '@alias/contracts';

/**
 * The small English starter pack bundled in the app binary as the offline seed
 * (spec §12). A fresh airplane-mode install plays from this with zero network;
 * the full catalog is downloaded on demand later.
 *
 * Plain describe-mode words only — per-locale Taboo lists are a v2 concern.
 * Typed against the wire `Pack`, and validated against the schema at test time.
 */
export const STARTER_EN: Pack = {
  id: 'starter.en',
  title: 'Starter',
  locale: 'en',
  schemaVersion: 1,
  cards: [
    { w: 'apple' },
    { w: 'mountain' },
    { w: 'guitar' },
    { w: 'ocean' },
    { w: 'robot' },
    { w: 'pizza' },
    { w: 'rainbow' },
    { w: 'elephant' },
    { w: 'bicycle' },
    { w: 'castle' },
    { w: 'sunflower' },
    { w: 'volcano' },
    { w: 'telescope' },
    { w: 'butterfly' },
    { w: 'sandwich' },
    { w: 'dragon' },
    { w: 'umbrella' },
    { w: 'lighthouse' },
    { w: 'kangaroo' },
    { w: 'waterfall' },
    { w: 'piano' },
    { w: 'dinosaur' },
    { w: 'snowman' },
    { w: 'pirate' },
    { w: 'rocket' },
    { w: 'hamburger' },
    { w: 'octopus' },
    { w: 'fireworks' },
    { w: 'treasure' },
    { w: 'penguin' },
    { w: 'helicopter' },
    { w: 'pancake' },
    { w: 'vampire' },
    { w: 'scarecrow' },
    { w: 'jellyfish' },
    { w: 'windmill' },
    { w: 'astronaut' },
    { w: 'cactus' },
    { w: 'igloo' },
    { w: 'marshmallow' },
    { w: 'tornado' },
    { w: 'wizard' },
    { w: 'submarine' },
    { w: 'pumpkin' },
    { w: 'skateboard' },
    { w: 'lemonade' },
    { w: 'campfire' },
    { w: 'mermaid' },
    { w: 'parachute' },
    { w: 'sandcastle' },
  ],
};
