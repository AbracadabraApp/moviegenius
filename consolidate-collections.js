#!/usr/bin/env node
/**
 * Collection Consolidation Process
 * 
 * Takes fragmented collections (many with <6 movies) and consolidates them into
 * curated, uniquely-named representative lists with 6+ movies each.
 * 
 * Key principles:
 * - Movies can appear on multiple lists
 * - Focus on unique, specific themes (avoid broad terms)
 * - Aim for 6-12 movies per consolidated collection
 * - Don't use all movies if they don't fit thematically
 */

import fs from 'fs';
import path from 'path';

class CollectionConsolidator {
  constructor(buildStateFile) {
    this.buildState = JSON.parse(fs.readFileSync(buildStateFile, 'utf8'));
    this.allLists = this.buildState.allLists;
    this.genre = this.buildState.metadata?.genre || path.basename(buildStateFile).split('-')[0];
    this.consolidatedCollections = {};
  }

  // Get lists under the size threshold (to consolidate) and large lists (to preserve)
  splitListsBySize(threshold = 6) {
    const smallLists = [];
    const largeLists = [];
    
    Object.entries(this.allLists).forEach(([name, data]) => {
      const size = data.movieCount || data.movieIds?.length || 0;
      const listData = {
        name,
        movieIds: data.movieIds || [],
        size
      };
      
      if (size < threshold) {
        smallLists.push(listData);
      } else {
        largeLists.push(listData);
      }
    });
    
    return { smallLists, largeLists };
  }

  // Group small lists by thematic similarity
  createThematicGroups() {
    const { smallLists, largeLists } = this.splitListsBySize();
    
    // Define genre-specific consolidation rules
    const consolidationRules = this.getConsolidationRulesForGenre();

    return this.applyConsolidationRules(smallLists, largeLists, consolidationRules);
  }

  // Get genre-specific consolidation rules
  getConsolidationRulesForGenre() {
    const genreRules = {
      Musical: [
        {
          name: "Vaudeville and Early Entertainment",
          keywords: ["vaudeville", "early", "revolution", "talkies", "sound"],
          targetSize: 8
        },
        {
          name: "Social Commentary Through Decades", 
          keywords: ["social", "commentary", "era", "rights"],
          targetSize: 10
        },
        {
          name: "Romance Adventure Settings",
          keywords: ["romance", "border", "desert", "ocean", "wilderness", "resort"],
          targetSize: 8
        },
        {
          name: "European Musical Elegance",
          keywords: ["european", "french", "viennese", "casino", "court", "operetta"],
          targetSize: 7
        },
        {
          name: "Holiday and Seasonal Celebrations",
          keywords: ["holiday", "christmas", "seasonal"],
          targetSize: 6
        },
        {
          name: "Jazz Age and Big Band Eras",
          keywords: ["jazz", "big band", "swing", "ragtime"],
          targetSize: 8
        },
        {
          name: "Parent-Child Musical Bonds",
          keywords: ["parent", "child", "father", "daughter", "son", "separation"],
          targetSize: 6
        },
        {
          name: "Competition and Sports Themes",
          keywords: ["competition", "sports", "swimming", "contest"],
          targetSize: 6
        },
        {
          name: "Mentor and Student Relationships",
          keywords: ["mentor", "student", "teacher", "guidance", "eccentric"],
          targetSize: 6
        },
        {
          name: "Innovation and Technology Pioneers",
          keywords: ["innovation", "technology", "pioneer", "media", "invention"],
          targetSize: 7
        }
      ],
      "Science Fiction": [
        {
          name: "Space Exploration Missions",
          keywords: ["space", "mars", "planet", "galaxy", "mission", "exploration"],
          targetSize: 8
        },
        {
          name: "Artificial Intelligence Awakening",
          keywords: ["ai", "robot", "android", "artificial", "intelligence", "machine"],
          targetSize: 8
        },
        {
          name: "Time Travel Paradoxes",
          keywords: ["time", "travel", "past", "future", "paradox", "temporal"],
          targetSize: 7
        },
        {
          name: "Dystopian Society Control",
          keywords: ["dystopian", "totalitarian", "control", "society", "surveillance"],
          targetSize: 8
        },
        {
          name: "Alien Contact Stories",
          keywords: ["alien", "extraterrestrial", "contact", "invasion", "outer space"],
          targetSize: 8
        },
        {
          name: "Genetic Engineering Ethics",
          keywords: ["genetic", "clone", "mutation", "dna", "experiment", "evolution"],
          targetSize: 7
        },
        {
          name: "Post-Apocalyptic Survival",
          keywords: ["apocalyptic", "survival", "wasteland", "catastrophe", "disaster"],
          targetSize: 8
        },
        {
          name: "Cyberpunk Digital Worlds",
          keywords: ["cyber", "digital", "virtual", "hacker", "matrix", "punk"],
          targetSize: 6
        }
      ],
      Animation: [
        {
          name: "Family Adventure Journeys",
          keywords: ["family", "adventure", "journey", "quest", "friendship"],
          targetSize: 8
        },
        {
          name: "Magical Worlds and Powers",
          keywords: ["magic", "magical", "fantasy", "power", "supernatural", "wizard"],
          targetSize: 8
        },
        {
          name: "Coming of Age Stories",
          keywords: ["coming", "age", "growing", "childhood", "teen", "youth"],
          targetSize: 7
        },
        {
          name: "Historical War & Conflict",
          keywords: ["war", "wartime", "holocaust", "historical", "wwii", "conflict", "fascist", "nuclear"],
          targetSize: 8
        },
        {
          name: "Identity & Representation",
          keywords: ["disability", "lgbtq", "identity", "gender", "representation", "cultural", "clone"],
          targetSize: 6
        },
        {
          name: "Horror & Dark Themes",
          keywords: ["horror", "space", "bioterror", "gothic", "scary", "dark", "survival"],
          targetSize: 5
        },
        {
          name: "Creative Arts & Process",
          keywords: ["creative", "process", "artist", "biography", "making", "documentary", "art"],
          targetSize: 5
        },
        {
          name: "Social Issues & Activism",
          keywords: ["community", "activism", "counterculture", "urban", "gang", "mental", "health"],
          targetSize: 6
        },
        {
          name: "Science Fiction Concepts",
          keywords: ["multiverse", "reality", "sci", "anthology", "space", "future", "interactive"],
          targetSize: 6
        },
        {
          name: "Cultural Heritage Stories",
          keywords: ["african", "folklore", "migration", "explorer", "preservation", "heritage"],
          targetSize: 5
        },
        {
          name: "Philosophical & Existential",
          keywords: ["philosophical", "conversation", "existential", "trauma", "generational", "pacifist"],
          targetSize: 5
        },
        {
          name: "Entertainment Industry",
          keywords: ["hollywood", "dream", "wrestling", "entertainment", "celebrity", "industry"],
          targetSize: 4
        }
      ],
      Documentary: [
        {
          name: "Historical Events and Eras",
          keywords: ["history", "historical", "war", "era", "period", "past"],
          targetSize: 8
        },
        {
          name: "Environmental and Nature Focus",
          keywords: ["environment", "nature", "climate", "wildlife", "conservation"],
          targetSize: 8
        },
        {
          name: "Social Issues and Justice",
          keywords: ["social", "justice", "rights", "inequality", "activism"],
          targetSize: 8
        },
        {
          name: "Science and Technology Exploration",
          keywords: ["science", "technology", "research", "discovery", "innovation"],
          targetSize: 7
        },
        {
          name: "Cultural Identity Stories",
          keywords: ["culture", "identity", "heritage", "community", "tradition"],
          targetSize: 7
        },
        {
          name: "Biography and Personal Stories",
          keywords: ["biography", "personal", "life", "story", "individual"],
          targetSize: 8
        }
      ],
      Fantasy: [
        {
          name: "Time Magic & Temporal Stories",
          keywords: ["time", "loop", "temporal", "reincarnation", "pre-birth", "intergenerational"],
          targetSize: 6
        },
        {
          name: "Magical Powers & Abilities", 
          keywords: ["magical", "powers", "inventor", "military", "sensory", "reality", "control"],
          targetSize: 7
        },
        {
          name: "Folk Magic & Cultural Mythology",
          keywords: ["folklore", "folk", "brazilian", "estonian", "ritual", "traditional", "holiday", "mythology"],
          targetSize: 6
        },
        {
          name: "Dark & Gothic Fantasy",
          keywords: ["dark", "gothic", "post-apocalyptic", "curse", "prophetic", "sinister"],
          targetSize: 5
        },
        {
          name: "Modern Urban Fantasy",
          keywords: ["urban", "guardian", "hidden", "miniature", "societies", "modern", "arthurian"],
          targetSize: 6
        },
        {
          name: "Mystical & Spiritual Journeys",
          keywords: ["mystical", "desert", "mysticism", "soul", "existential", "tests", "ninja"],
          targetSize: 5
        },
        {
          name: "Magical Family & Childhood",
          keywords: ["childhood", "escape", "parenting", "maternal", "monster", "abandoned", "circus"],
          targetSize: 5
        },
        {
          name: "Fantasy Music & Arts",
          keywords: ["musical", "biography", "vampire", "music", "reality", "cosmic", "railway"],
          targetSize: 4
        },
        {
          name: "Supernatural Romance & Comedy",
          keywords: ["romantic", "comedy", "refugee", "supernatural", "vampire", "romance"],
          targetSize: 4
        },
        {
          name: "Psychedelic & Surreal Fantasy", 
          keywords: ["psychedelic", "space", "surrealism", "haunted", "house", "cosmic", "railway"],
          targetSize: 4
        }
      ],
      Biblical: [
        {
          name: "Old Testament Epics",
          keywords: ["moses", "exodus", "abraham", "noah", "david", "solomon", "samson"],
          targetSize: 8
        },
        {
          name: "New Testament Stories",
          keywords: ["jesus", "christ", "apostle", "disciple", "crucifixion", "resurrection"],
          targetSize: 6
        },
        {
          name: "Ancient Biblical Kingdoms",
          keywords: ["israel", "judah", "babylon", "egypt", "pharaoh", "king", "queen"],
          targetSize: 6
        },
        {
          name: "Biblical Women Stories",
          keywords: ["esther", "ruth", "mary", "magdalene", "woman", "female"],
          targetSize: 5
        },
        {
          name: "Prophetic and Apocalyptic",
          keywords: ["prophet", "revelation", "apocalypse", "judgment", "divine"],
          targetSize: 4
        }
      ],
      Period: [
        {
          name: "Medieval & Renaissance Europe",
          keywords: ["medieval", "renaissance", "knight", "castle", "crusade", "monastery"],
          targetSize: 8
        },
        {
          name: "Colonial Americas",
          keywords: ["colonial", "pilgrim", "frontier", "revolution", "independence"],
          targetSize: 7
        },
        {
          name: "Victorian & Edwardian Era",
          keywords: ["victorian", "edwardian", "empire", "industrial", "aristocracy"],
          targetSize: 8
        },
        {
          name: "Ancient Civilizations",
          keywords: ["ancient", "rome", "greece", "egypt", "civilization", "empire"],
          targetSize: 6
        },
        {
          name: "European Royal Courts",
          keywords: ["royal", "court", "palace", "nobility", "aristocrat", "monarch"],
          targetSize: 7
        },
        {
          name: "Religious Historical Events",
          keywords: ["church", "monastery", "crusade", "inquisition", "reformation"],
          targetSize: 5
        }
      ],
      Adventure: [
        {
          name: "Treasure Hunting Expeditions",
          keywords: ["treasure", "pirate", "gold", "expedition", "archaeological", "heist"],
          targetSize: 8
        },
        {
          name: "Survival Wilderness Adventures",
          keywords: ["survival", "wilderness", "mountain", "ocean", "desert", "arctic"],
          targetSize: 8
        },
        {
          name: "Exploration & Discovery",
          keywords: ["exploration", "discovery", "jungle", "expedition", "unknown", "lost"],
          targetSize: 7
        },
        {
          name: "Maritime Adventures",
          keywords: ["sea", "ocean", "ship", "sailing", "naval", "maritime"],
          targetSize: 7
        },
        {
          name: "Action Rescue Missions",
          keywords: ["rescue", "mission", "hostage", "kidnap", "escape", "chase"],
          targetSize: 6
        },
        {
          name: "Ancient World Adventures",
          keywords: ["ancient", "mythology", "civilization", "temple", "artifact"],
          targetSize: 6
        }
      ],
      War: [
        {
          name: "World War II Stories",
          keywords: ["wwii", "world war", "nazi", "holocaust", "resistance", "allied"],
          targetSize: 12
        },
        {
          name: "Vietnam War Experiences",
          keywords: ["vietnam", "vietnamese", "saigon", "jungle", "napalm", "draft"],
          targetSize: 8
        },
        {
          name: "Civil War Narratives", 
          keywords: ["civil war", "union", "confederate", "slavery", "lincoln"],
          targetSize: 6
        },
        {
          name: "Modern Military Operations",
          keywords: ["iraq", "afghanistan", "gulf", "terror", "special forces", "navy seal"],
          targetSize: 8
        },
        {
          name: "Revolutionary Wars",
          keywords: ["revolution", "independence", "colonial", "guerrilla", "uprising"],
          targetSize: 6
        },
        {
          name: "Prisoner of War Stories",
          keywords: ["pow", "prisoner", "camp", "escape", "torture", "survival"],
          targetSize: 5
        },
        {
          name: "War Journalism & Reporting",
          keywords: ["journalist", "correspondent", "media", "reporting", "witness"],
          targetSize: 4
        },
        {
          name: "Military Leadership & Strategy",
          keywords: ["general", "commander", "strategy", "tactics", "leadership"],
          targetSize: 6
        },
        {
          name: "Home Front & Civilian Impact",
          keywords: ["home front", "civilian", "rationing", "factory", "women", "family"],
          targetSize: 5
        },
        {
          name: "Anti-War & Peace Messages",
          keywords: ["anti-war", "peace", "pacifist", "protest", "conscientious"],
          targetSize: 4
        }
      ],
      Western: [
        {
          name: "Classic Frontier Towns",
          keywords: ["frontier", "town", "sheriff", "outlaw", "saloon", "cattle"],
          targetSize: 8
        },
        {
          name: "Native American Relations",
          keywords: ["native", "indian", "tribe", "apache", "sioux", "reservation"],
          targetSize: 6
        },
        {
          name: "Gunfighter & Outlaw Tales",
          keywords: ["gunfighter", "outlaw", "bandit", "gang", "showdown", "duel"],
          targetSize: 7
        },
        {
          name: "Ranch & Cattle Stories",
          keywords: ["ranch", "cattle", "cowboy", "rancher", "rustler", "drive"],
          targetSize: 6
        },
        {
          name: "Gold Rush Adventures",
          keywords: ["gold", "mining", "prospector", "claim", "strike", "boom"],
          targetSize: 5
        },
        {
          name: "Railroad & Settlement",
          keywords: ["railroad", "train", "settlement", "pioneer", "homestead"],
          targetSize: 5
        },
        {
          name: "Law & Order Frontier",
          keywords: ["marshal", "law", "justice", "court", "judge", "hanging"],
          targetSize: 5
        },
        {
          name: "Modern Western Settings",
          keywords: ["modern", "contemporary", "neo-western", "urban", "truck"],
          targetSize: 4
        }
      ],
      Music: [
        {
          name: "Rock & Pop Evolution",
          keywords: ["rock", "pop", "band", "music industry", "record", "album"],
          targetSize: 10
        },
        {
          name: "Classical & Opera Traditions",
          keywords: ["classical", "opera", "symphony", "composer", "conductor", "orchestra"],
          targetSize: 8
        },
        {
          name: "Jazz & Blues Heritage",
          keywords: ["jazz", "blues", "swing", "bebop", "saxophone", "piano"],
          targetSize: 8
        },
        {
          name: "Country & Folk Traditions",
          keywords: ["country", "folk", "bluegrass", "nashville", "acoustic", "rural"],
          targetSize: 6
        },
        {
          name: "Hip-Hop & Urban Music",
          keywords: ["hip-hop", "rap", "urban", "street", "breakdance", "turntable"],
          targetSize: 6
        },
        {
          name: "World Music Cultures",
          keywords: ["world", "ethnic", "traditional", "cultural", "indigenous", "heritage"],
          targetSize: 7
        },
        {
          name: "Music Education & Mentorship",
          keywords: ["teacher", "student", "school", "education", "mentor", "lesson"],
          targetSize: 5
        },
        {
          name: "Music Industry Drama",
          keywords: ["industry", "producer", "studio", "contract", "fame", "success"],
          targetSize: 6
        },
        {
          name: "Performance & Concert Films",
          keywords: ["concert", "performance", "tour", "stage", "live", "audience"],
          targetSize: 5
        },
        {
          name: "Musical Instrument Focus",
          keywords: ["piano", "guitar", "violin", "drums", "instrument", "musician"],
          targetSize: 4
        }
      ],
      Superhero: [
        {
          name: "Marvel Cinematic Universe",
          keywords: ["marvel", "mcu", "avengers", "iron man", "captain america", "thor"],
          targetSize: 10
        },
        {
          name: "DC Comics Adaptations", 
          keywords: ["dc", "batman", "superman", "wonder woman", "justice league"],
          targetSize: 8
        },
        {
          name: "Origin Story Adventures",
          keywords: ["origin", "first", "begins", "rise", "awakening", "birth"],
          targetSize: 6
        },
        {
          name: "Team Superhero Ensembles",
          keywords: ["team", "group", "squad", "alliance", "united", "together"],
          targetSize: 6
        },
        {
          name: "Dark Superhero Stories",
          keywords: ["dark", "noir", "gritty", "vigilante", "antihero", "mature"],
          targetSize: 5
        },
        {
          name: "Comedy Superhero Parodies",
          keywords: ["comedy", "parody", "satire", "spoof", "funny", "humor"],
          targetSize: 4
        }
      ],
      Romance: [
        {
          name: "Romantic Comedy Classics",
          keywords: ["comedy", "rom-com", "romantic comedy", "funny", "humor", "lighthearted"],
          targetSize: 12
        },
        {
          name: "Period Romance Dramas",
          keywords: ["period", "historical", "victorian", "regency", "costume", "19th century"],
          targetSize: 10
        },
        {
          name: "Wedding & Marriage Stories",
          keywords: ["wedding", "marriage", "bride", "groom", "ceremony", "honeymoon"],
          targetSize: 8
        },
        {
          name: "Young Adult Romance",
          keywords: ["teen", "young adult", "high school", "college", "coming of age"],
          targetSize: 8
        },
        {
          name: "International Romance",
          keywords: ["foreign", "international", "cultural", "language", "cross-cultural"],
          targetSize: 8
        },
        {
          name: "Second Chance Romance",
          keywords: ["reunion", "second chance", "divorce", "separated", "rekindled", "lost love"],
          targetSize: 6
        },
        {
          name: "Holiday Romance Films",
          keywords: ["christmas", "valentine", "holiday", "seasonal", "winter", "summer"],
          targetSize: 6
        },
        {
          name: "Workplace Romance",
          keywords: ["office", "workplace", "boss", "colleague", "professional", "career"],
          targetSize: 6
        },
        {
          name: "Friends to Lovers",
          keywords: ["friendship", "friends", "best friend", "childhood", "neighbor"],
          targetSize: 5
        },
        {
          name: "Long Distance Romance",
          keywords: ["long distance", "separation", "travel", "letters", "phone", "online"],
          targetSize: 4
        }
      ],
      Comedy: [
        {
          name: "Romantic Comedy Collection",
          keywords: ["romantic", "rom-com", "romance", "dating", "wedding", "love"],
          targetSize: 15
        },
        {
          name: "Workplace Comedy Stories",
          keywords: ["office", "work", "job", "boss", "career", "business"],
          targetSize: 12
        },
        {
          name: "Family Comedy Adventures",
          keywords: ["family", "parent", "child", "kids", "domestic", "household"],
          targetSize: 12
        },
        {
          name: "High School & Teen Comedy",
          keywords: ["high school", "teen", "teenage", "college", "student", "graduation"],
          targetSize: 10
        },
        {
          name: "Buddy Comedy Partnerships",
          keywords: ["buddy", "friend", "friendship", "partner", "duo", "road trip"],
          targetSize: 10
        },
        {
          name: "Parody & Satire Films",
          keywords: ["parody", "satire", "spoof", "mock", "lampoon", "send-up"],
          targetSize: 8
        },
        {
          name: "Holiday Comedy Specials",
          keywords: ["christmas", "holiday", "valentine", "thanksgiving", "new year"],
          targetSize: 6
        },
        {
          name: "Crime Comedy Capers",
          keywords: ["heist", "crime", "robbery", "con", "scam", "gangster"],
          targetSize: 8
        },
        {
          name: "Sports Comedy Films",
          keywords: ["sports", "team", "coach", "athlete", "game", "competition"],
          targetSize: 6
        },
        {
          name: "Road Trip & Travel Comedy",
          keywords: ["road", "travel", "vacation", "trip", "journey", "adventure"],
          targetSize: 6
        },
        {
          name: "Mistaken Identity Comedy",
          keywords: ["identity", "mistaken", "disguise", "impersonation", "switch"],
          targetSize: 5
        },
        {
          name: "Gender Role Comedy",
          keywords: ["gender", "cross-dressing", "role reversal", "battle of sexes"],
          targetSize: 5
        }
      ],
      Horror: [
        {
          name: "Slasher Film Collection",
          keywords: ["slasher", "killer", "murder", "masked", "serial", "stalk"],
          targetSize: 12
        },
        {
          name: "Supernatural Horror Stories",
          keywords: ["ghost", "haunted", "spirit", "paranormal", "supernatural", "possession"],
          targetSize: 12
        },
        {
          name: "Monster & Creature Features",
          keywords: ["monster", "creature", "beast", "werewolf", "vampire", "zombie"],
          targetSize: 10
        },
        {
          name: "Psychological Thriller Horror",
          keywords: ["psychological", "mind", "mental", "insanity", "madness", "psycho"],
          targetSize: 10
        },
        {
          name: "Body Horror & Gore",
          keywords: ["body horror", "gore", "mutilation", "transformation", "flesh", "blood"],
          targetSize: 8
        },
        {
          name: "Demonic & Occult Horror",
          keywords: ["demon", "devil", "occult", "satanic", "ritual", "cult"],
          targetSize: 8
        },
        {
          name: "Horror Comedy Hybrids",
          keywords: ["comedy", "parody", "satire", "funny", "humor", "spoof"],
          targetSize: 8
        },
        {
          name: "Survival Horror Scenarios",
          keywords: ["survival", "trapped", "isolation", "wilderness", "cabin", "remote"],
          targetSize: 6
        },
        {
          name: "Apocalyptic Horror Visions",
          keywords: ["apocalypse", "end times", "plague", "infection", "outbreak", "pandemic"],
          targetSize: 6
        },
        {
          name: "Classic Horror Remakes",
          keywords: ["remake", "reboot", "classic", "revival", "reimagined", "updated"],
          targetSize: 5
        }
      ],
      Documentary: [
        {
          name: "Music Industry Documentaries",
          keywords: ["music", "band", "musician", "concert", "album", "recording"],
          targetSize: 12
        },
        {
          name: "Political & Social Issues",
          keywords: ["politics", "government", "social", "activism", "protest", "rights"],
          targetSize: 12
        },
        {
          name: "Historical Events & Figures",
          keywords: ["history", "historical", "war", "battle", "leader", "event"],
          targetSize: 10
        },
        {
          name: "Nature & Wildlife Films",
          keywords: ["nature", "wildlife", "animal", "environment", "ecosystem", "planet"],
          targetSize: 10
        },
        {
          name: "Celebrity & Biography",
          keywords: ["celebrity", "biography", "life", "profile", "portrait", "star"],
          targetSize: 8
        },
        {
          name: "Crime & Investigation",
          keywords: ["crime", "murder", "investigation", "detective", "case", "trial"],
          targetSize: 8
        },
        {
          name: "Sports & Athletes",
          keywords: ["sports", "athlete", "team", "game", "competition", "olympics"],
          targetSize: 6
        },
        {
          name: "Science & Technology",
          keywords: ["science", "technology", "research", "discovery", "innovation", "experiment"],
          targetSize: 6
        },
        {
          name: "Cultural Exploration",
          keywords: ["culture", "society", "tradition", "community", "heritage", "anthropology"],
          targetSize: 6
        },
        {
          name: "Personal Journey Stories",
          keywords: ["personal", "journey", "memoir", "family", "relationship", "experience"],
          targetSize: 5
        }
      ],
      Crime: [
        {
          name: "Organized Crime & Mafia",
          keywords: ["mafia", "mob", "organized crime", "gangster", "syndicate", "family"],
          targetSize: 12
        },
        {
          name: "Heist & Robbery Films",
          keywords: ["heist", "robbery", "bank", "theft", "steal", "caper"],
          targetSize: 10
        },
        {
          name: "Police Detective Stories",
          keywords: ["detective", "police", "cop", "investigation", "precinct", "badge"],
          targetSize: 10
        },
        {
          name: "Drug Trade & Trafficking",
          keywords: ["drug", "narcotics", "dealer", "cartel", "trafficking", "smuggling"],
          targetSize: 8
        },
        {
          name: "Murder Mystery & Investigation",
          keywords: ["murder", "homicide", "killer", "investigation", "solve", "case"],
          targetSize: 8
        },
        {
          name: "Con Artist & Fraud",
          keywords: ["con", "scam", "fraud", "grift", "swindle", "deceive"],
          targetSize: 6
        },
        {
          name: "Prison & Incarceration",
          keywords: ["prison", "jail", "inmate", "convict", "sentence", "cell"],
          targetSize: 6
        },
        {
          name: "Vigilante Justice",
          keywords: ["vigilante", "revenge", "justice", "payback", "retribution", "vengeance"],
          targetSize: 6
        },
        {
          name: "White Collar Crime",
          keywords: ["corporate", "fraud", "embezzlement", "corruption", "business", "executive"],
          targetSize: 5
        },
        {
          name: "Serial Killer Profiles",
          keywords: ["serial", "psychopath", "stalker", "profile", "hunt", "pattern"],
          targetSize: 5
        }
      ],
      Thriller: [
        {
          name: "Psychological Mind Games",
          keywords: ["psychological", "mind", "mental", "obsession", "paranoia", "manipulation"],
          targetSize: 12
        },
        {
          name: "Action Chase Thrillers",
          keywords: ["chase", "pursuit", "action", "escape", "run", "hunt"],
          targetSize: 10
        },
        {
          name: "Conspiracy & Cover-Up",
          keywords: ["conspiracy", "cover-up", "government", "secret", "truth", "expose"],
          targetSize: 10
        },
        {
          name: "Kidnapping & Hostage",
          keywords: ["kidnap", "hostage", "ransom", "abduction", "captive", "rescue"],
          targetSize: 8
        },
        {
          name: "Espionage & Spy Stories",
          keywords: ["spy", "espionage", "agent", "cia", "intelligence", "undercover"],
          targetSize: 8
        },
        {
          name: "Survival Against Odds",
          keywords: ["survival", "trapped", "stranded", "isolated", "wilderness", "desperate"],
          targetSize: 8
        },
        {
          name: "Identity & Memory Loss",
          keywords: ["identity", "memory", "amnesia", "forgotten", "past", "mystery"],
          targetSize: 6
        },
        {
          name: "Stalker & Obsession",
          keywords: ["stalker", "obsession", "follow", "watch", "creepy", "fixated"],
          targetSize: 6
        },
        {
          name: "Technology & Surveillance",
          keywords: ["technology", "surveillance", "hacker", "computer", "digital", "cyber"],
          targetSize: 6
        },
        {
          name: "Medical & Scientific Thriller",
          keywords: ["medical", "doctor", "hospital", "virus", "experiment", "scientific"],
          targetSize: 5
        },
        {
          name: "Revenge & Payback Stories",
          keywords: ["revenge", "payback", "vengeance", "retribution", "get back", "settle"],
          targetSize: 8
        },
        {
          name: "Relationship & Domestic Thriller",
          keywords: ["marriage", "husband", "wife", "relationship", "domestic", "family"],
          targetSize: 8
        },
        {
          name: "Workplace & Corporate Thriller",
          keywords: ["office", "work", "corporate", "business", "company", "job"],
          targetSize: 6
        },
        {
          name: "Historical Period Suspense",
          keywords: ["historical", "period", "war", "wwii", "wwi", "past"],
          targetSize: 6
        },
        {
          name: "International & Foreign Intrigue",
          keywords: ["international", "foreign", "overseas", "border", "embassy", "diplomat"],
          targetSize: 6
        },
        {
          name: "Murder Mystery Investigation",
          keywords: ["murder", "kill", "dead", "death", "investigate", "solve"],
          targetSize: 8
        },
        {
          name: "Crime & Criminal Underground",
          keywords: ["crime", "criminal", "gang", "underground", "illegal", "law"],
          targetSize: 6
        },
        {
          name: "Small Town Dark Secrets",
          keywords: ["small town", "village", "rural", "community", "neighbor", "local"],
          targetSize: 6
        },
        {
          name: "Disaster & Catastrophe Survival",
          keywords: ["disaster", "catastrophe", "emergency", "crisis", "accident", "crash"],
          targetSize: 6
        },
        {
          name: "Supernatural & Horror Thriller",
          keywords: ["supernatural", "ghost", "haunted", "spirit", "occult", "dark"],
          targetSize: 5
        },
        {
          name: "Road Trip & Travel Danger",
          keywords: ["road", "travel", "trip", "vacation", "journey", "destination"],
          targetSize: 5
        },
        {
          name: "Legal & Courtroom Drama",
          keywords: ["legal", "court", "lawyer", "judge", "trial", "case"],
          targetSize: 5
        },
        {
          name: "Student & Campus Thriller",
          keywords: ["student", "school", "college", "campus", "university", "academic"],
          targetSize: 4
        },
        {
          name: "Media & Entertainment Industry",
          keywords: ["media", "tv", "film", "entertainment", "celebrity", "fame"],
          targetSize: 4
        },
        {
          name: "Military & War Suspense",
          keywords: ["military", "soldier", "army", "navy", "combat", "battle"],
          targetSize: 4
        }
      ]
    };

    return genreRules[this.genre] || this.getGenericConsolidationRules();
  }

  // Generic consolidation rules for unknown genres
  getGenericConsolidationRules() {
    return [
      {
        name: "Character-Driven Stories",
        keywords: ["character", "hero", "protagonist", "journey", "story"],
        targetSize: 8
      },
      {
        name: "Action and Adventure",
        keywords: ["action", "adventure", "fight", "battle", "conflict"],
        targetSize: 8
      },
      {
        name: "Romance and Relationships",
        keywords: ["romance", "love", "relationship", "couple", "marriage"],
        targetSize: 7
      },
      {
        name: "Mystery and Suspense",
        keywords: ["mystery", "suspense", "thriller", "investigation", "crime"],
        targetSize: 7
      },
      {
        name: "Family and Community",
        keywords: ["family", "community", "home", "friendship", "social"],
        targetSize: 7
      },
      {
        name: "Colonial & Cultural Identity",
        keywords: ["colonial", "independence", "cultural", "identity", "resistance", "working", "class"],
        targetSize: 8
      },
      {
        name: "European Society & Politics", 
        keywords: ["russian", "italian", "german", "aristocracy", "society", "political"],
        targetSize: 8
      },
      {
        name: "Religious & Moral Conflicts",
        keywords: ["religious", "victorian", "moral", "witch", "trial", "horror"],
        targetSize: 7
      },
      {
        name: "Arts & Cultural Movements",
        keywords: ["artist", "muse", "theatrical", "shakespeare", "kurosawa", "cultural"],
        targetSize: 6
      },
      {
        name: "Social Justice & Reform",
        keywords: ["suffragette", "gender", "medical", "legal", "justice", "reform", "race"],
        targetSize: 6
      },
      {
        name: "East Asian Period Dramas",
        keywords: ["martial", "chinese", "joseon", "japanese", "courtesan", "asian"],
        targetSize: 6
      },
      {
        name: "American Gilded Age & Industry", 
        keywords: ["gilded", "age", "oil", "baron", "victorian", "heist", "industry"],
        targetSize: 5
      },
      {
        name: "Isolation & Survival Stories",
        keywords: ["lighthouse", "keeper", "epidemic", "crisis", "medieval", "slavery", "survival"],
        targetSize: 4
      }
    ];
  }

  applyConsolidationRules(smallLists, largeLists, rules) {
    const consolidatedCollections = {};
    const usedLists = new Set();

    // PHASE 1: Consolidate unused lists first (prioritize getting movies into collections)
    console.log('🔄 PHASE 1: Consolidating unused small lists using genre-specific rules...');
    
    for (const rule of rules) {
      const matchingLists = smallLists.filter(list => {
        if (usedLists.has(list.name)) return false;
        
        const listNameLower = list.name.toLowerCase();
        return rule.keywords.some(keyword => 
          listNameLower.includes(keyword.toLowerCase())
        );
      });

      if (matchingLists.length > 0) {
        // Combine movie IDs from matching lists
        const allMovieIds = new Set();
        matchingLists.forEach(list => {
          list.movieIds.forEach(id => allMovieIds.add(id));
          usedLists.add(list.name);
        });

        // Only create collection if we have enough movies
        if (allMovieIds.size >= 6) {
          consolidatedCollections[rule.name] = {
            name: rule.name,
            movieIds: Array.from(allMovieIds).slice(0, rule.targetSize),
            movieCount: Math.min(allMovieIds.size, rule.targetSize),
            sourceCollections: matchingLists.map(l => l.name),
            consolidationRule: rule.keywords.join(', '),
            type: 'consolidated_from_small_lists'
          };
        }
      }
    }

    // PHASE 2: Identify collections by size after initial consolidation
    const oversizedCollections = largeLists.filter(list => list.size > 30);
    const normalLargeLists = largeLists.filter(list => list.size <= 30);
    
    // PHASE 3: Preserve normal-sized collections (6-30 items) 
    console.log(`🔄 PHASE 2: Preserving ${normalLargeLists.length} normal-sized collections...`);
    normalLargeLists.forEach(list => {
      consolidatedCollections[list.name] = {
        name: list.name,
        movieIds: list.movieIds,
        movieCount: list.size,
        type: 'preserved_large_list'
      };
    });

    // PHASE 4: Spread oversized collections (redistribute movies to existing smaller collections where thematically appropriate)
    console.log(`🔄 PHASE 3: Spreading ${oversizedCollections.length} oversized collections...`);
    this.spreadOversizedCollections(oversizedCollections, consolidatedCollections, rules);

    return { consolidatedCollections, unusedLists: smallLists.filter(l => !usedLists.has(l.name)) };
  }

  // NEW: Actually spread oversized collections by splitting them into smaller thematic collections
  spreadOversizedCollections(oversizedCollections, consolidatedCollections, rules) {
    oversizedCollections.forEach(oversizedList => {
      console.log(`🔄 SPLITTING: ${oversizedList.name} (${oversizedList.size} movies) into smaller collections`);
      
      // Strategy: Split oversized collection using genre-specific rebalancing rules
      const genreStrategy = this.getGenreSpecificStrategy();
      const splitResult = this.splitOversizedCollection(oversizedList, genreStrategy);
      
      if (splitResult.newCollections.length > 0) {
        console.log(`  ✅ Split into ${splitResult.newCollections.length} smaller collections`);
        
        // Add the new split collections to consolidatedCollections
        splitResult.newCollections.forEach(newCollection => {
          consolidatedCollections[newCollection.name] = {
            name: newCollection.name,
            movieIds: newCollection.movieIds,
            movieCount: newCollection.movieIds.length,
            type: 'split_from_oversized',
            originalCollection: oversizedList.name,
            splitStrategy: newCollection.strategy
          };
        });
        
        // If there's a remainder that's still reasonable size, keep it
        if (splitResult.remainder && splitResult.remainder.movieIds.length >= 6 && splitResult.remainder.movieIds.length <= 45) {
          consolidatedCollections[splitResult.remainder.name] = {
            name: splitResult.remainder.name,
            movieIds: splitResult.remainder.movieIds,
            movieCount: splitResult.remainder.movieIds.length,
            type: 'split_remainder',
            originalCollection: oversizedList.name
          };
        }
      } else {
        // Fallback: Simple mathematical split if no thematic rules available
        console.log(`  📊 No thematic rules found - applying mathematical split`);
        const mathSplit = this.simpleSplitOversizedCollection(oversizedList);
        
        mathSplit.forEach((splitCollection, index) => {
          consolidatedCollections[splitCollection.name] = {
            name: splitCollection.name,
            movieIds: splitCollection.movieIds,
            movieCount: splitCollection.movieIds.length,
            type: 'mathematically_split',
            originalCollection: oversizedList.name,
            splitIndex: index + 1
          };
        });
      }
    });
  }

  // Split oversized collection using genre-specific rebalancing rules
  splitOversizedCollection(oversizedList, genreStrategy) {
    if (!genreStrategy || !genreStrategy.rebalanceRules || genreStrategy.rebalanceRules.length === 0) {
      return { newCollections: [], remainder: null };
    }

    const newCollections = [];
    let remainingMovies = [...oversizedList.movieIds];
    
    // Try to apply each rebalance rule to extract themed collections
    genreStrategy.rebalanceRules.forEach(rule => {
      if (rule.from === oversizedList.name && rule.redistributeTo && rule.redistributeTo.length > 0) {
        // Calculate movies per new collection
        const moviesPerCollection = Math.floor(remainingMovies.length / rule.redistributeTo.length);
        const minSize = genreStrategy.idealSize.min || 10;
        
        if (moviesPerCollection >= minSize) {
          rule.redistributeTo.forEach((targetName, index) => {
            const startIndex = index * moviesPerCollection;
            const endIndex = Math.min(startIndex + moviesPerCollection, remainingMovies.length);
            const collectionMovies = remainingMovies.slice(startIndex, endIndex);
            
            if (collectionMovies.length >= minSize) {
              newCollections.push({
                name: targetName,
                movieIds: collectionMovies,
                strategy: `Extracted from ${oversizedList.name} using themes: ${rule.themes.join(', ')}`
              });
            }
          });
          
          // Update remaining movies
          const usedMovies = moviesPerCollection * rule.redistributeTo.length;
          remainingMovies = remainingMovies.slice(usedMovies);
        }
      }
    });
    
    // Create remainder if we have movies left over
    let remainder = null;
    if (remainingMovies.length >= 6) {
      remainder = {
        name: `${oversizedList.name} (Core)`,
        movieIds: remainingMovies
      };
    }
    
    return { newCollections, remainder };
  }

  // Fallback: Simple mathematical split when no thematic rules available
  simpleSplitOversizedCollection(oversizedList) {
    const targetSize = 35; // Target size for split collections
    const numSplits = Math.ceil(oversizedList.size / targetSize);
    const moviesPerSplit = Math.floor(oversizedList.movieIds.length / numSplits);
    
    const splitCollections = [];
    
    for (let i = 0; i < numSplits; i++) {
      const startIndex = i * moviesPerSplit;
      const endIndex = i === numSplits - 1 ? oversizedList.movieIds.length : (i + 1) * moviesPerSplit;
      const splitMovies = oversizedList.movieIds.slice(startIndex, endIndex);
      
      if (splitMovies.length >= 6) {
        splitCollections.push({
          name: `${oversizedList.name} (Part ${i + 1})`,
          movieIds: splitMovies
        });
      }
    }
    
    return splitCollections;
  }

  // Find existing smaller collections that could receive movies from oversized list (LEGACY - unused now)
  findRedistributionTargets(oversizedList, consolidatedCollections) {
    const targets = [];
    
    Object.values(consolidatedCollections).forEach(collection => {
      // Look for consolidated collections that are still under their ideal size
      if (collection.type === 'consolidated_from_small_lists' && collection.movieCount < 20) {
        targets.push({
          name: collection.name,
          currentSize: collection.movieCount,
          capacity: 20 - collection.movieCount,
          collection: collection
        });
      }
      
      // Look for preserved collections that could grow slightly (but stay under 30)
      if (collection.type === 'preserved_large_list' && collection.movieCount < 25) {
        targets.push({
          name: collection.name,
          currentSize: collection.movieCount,
          capacity: Math.min(10, 30 - collection.movieCount), // Conservative growth
          collection: collection
        });
      }
    });
    
    return targets.sort((a, b) => (b.capacity - a.capacity)); // Sort by available capacity
  }

  // Attempt to redistribute movies based on thematic fit
  attemptThematicRedistribution(oversizedList, redistributionTargets) {
    // This is a placeholder for thematic matching logic
    // In a real implementation, this would analyze movie themes/keywords
    // and match them to appropriate target collections
    
    return {
      redistributedCount: 0, // For now, no actual redistribution
      remainingMovies: oversizedList.movieIds,
      redistributionDetails: "Thematic analysis not yet implemented - requires movie metadata analysis"
    };
  }

  // Fallback: flag oversized collections for manual review using existing genre-specific rebalancing
  flagForManualRebalancing(oversizedList, consolidatedCollections) {
    // Use existing genre-specific rebalancing logic
    this.performGenreSpecificRebalancing([oversizedList], consolidatedCollections);
  }

  // Advanced rebalancing: redistribute movies from oversized collections to smaller ones (LEGACY)
  rebalanceOversizedCollections(oversizedCollections, consolidatedCollections, rules) {
    // Use genre-specific rebalancing if available
    this.performGenreSpecificRebalancing(oversizedCollections, consolidatedCollections);
  }

  // Suggest which collections could receive movies from oversized ones
  suggestRebalanceTargets(oversizedList, consolidatedCollections, rules) {
    const targets = [];
    
    // Find small consolidated collections that could grow
    Object.values(consolidatedCollections).forEach(collection => {
      if (collection.type === 'consolidated_from_small_lists' && collection.movieCount < 15) {
        targets.push(collection.name);
      }
    });
    
    // Suggest creating new themed collections based on rules
    rules.forEach(rule => {
      if (!Object.values(consolidatedCollections).find(c => c.name === rule.name)) {
        targets.push(`New: ${rule.name}`);
      }
    });
    
    return targets.slice(0, 3); // Top 3 suggestions
  }

  // Genre-specific consolidation strategies
  getGenreSpecificStrategy() {
    const strategies = {
      Fantasy: {
        oversizedThreshold: 50,
        idealSize: { min: 12, max: 35 },
        rebalanceRules: [
          {
            from: "Modern Magical Realism",
            themes: ["urban fantasy", "contemporary magic", "hidden world"],
            redistributeTo: ["Modern Urban Fantasy", "Hidden Magical Societies", "Contemporary Witchcraft"]
          },
          {
            from: "Coming-of-Age Fantasy", 
            themes: ["young adult", "school", "first magic", "teen"],
            redistributeTo: ["Magical School Stories", "Teen Supernatural Awakening", "Young Adult Fantasy"]
          },
          {
            from: "Ancient Civilization Epics",
            themes: ["egyptian", "greek", "roman", "norse", "celtic"],
            redistributeTo: ["Egyptian Mythology", "Greek & Roman Epics", "Norse Legends", "Celtic Fantasy"]
          }
        ]
      },
      Adventure: {
        oversizedThreshold: 45,
        idealSize: { min: 10, max: 30 },
        rebalanceRules: [
          {
            from: "Treasure Hunting Adventures",
            themes: ["pirate", "archaeological", "heist", "expedition"],
            redistributeTo: ["Pirate Adventures", "Archaeological Expeditions", "Modern Heist Films"]
          },
          {
            from: "Survival Adventures",
            themes: ["wilderness", "ocean", "desert", "arctic", "jungle"],
            redistributeTo: ["Wilderness Survival", "Ocean Adventures", "Desert Expeditions", "Arctic Survival"]
          }
        ]
      },
      Horror: {
        oversizedThreshold: 40,
        idealSize: { min: 8, max: 25 },
        rebalanceRules: [
          {
            from: "Supernatural Horror",
            themes: ["ghost", "demon", "possession", "haunted"],
            redistributeTo: ["Haunted House Horror", "Demonic Possession", "Ghost Stories", "Supernatural Entities"]
          }
        ]
      },
      Comedy: {
        oversizedThreshold: 60,
        idealSize: { min: 15, max: 40 },
        rebalanceRules: [
          {
            from: "Romantic Comedy",
            themes: ["workplace", "enemies to lovers", "fake relationship", "holiday"],
            redistributeTo: ["Workplace Romance", "Enemies to Lovers", "Holiday Romance", "Fake Relationship Comedy"]
          }
        ]
      }
    };

    return strategies[this.genre] || {
      oversizedThreshold: 30,
      idealSize: { min: 10, max: 25 },
      rebalanceRules: []
    };
  }

  // Advanced genre-aware rebalancing
  performGenreSpecificRebalancing(oversizedCollections, consolidatedCollections) {
    const strategy = this.getGenreSpecificStrategy();
    
    oversizedCollections.forEach(oversizedList => {
      console.log(`🔄 GENRE-SPECIFIC REBALANCING: ${oversizedList.name} (${oversizedList.size} movies)`);
      
      // Find applicable rebalance rule for this collection
      const applicableRule = strategy.rebalanceRules.find(rule => 
        oversizedList.name.includes(rule.from) || rule.from.includes(oversizedList.name)
      );

      if (applicableRule) {
        console.log(`   📋 Applying ${this.genre} rebalance rule: ${applicableRule.from}`);
        console.log(`   🎯 Suggested redistribution: ${applicableRule.redistributeTo.join(', ')}`);
        
        consolidatedCollections[oversizedList.name] = {
          name: `${oversizedList.name} [REBALANCE NEEDED]`,
          movieIds: oversizedList.movieIds,
          movieCount: oversizedList.size,
          type: 'oversized_with_genre_strategy',
          genreStrategy: applicableRule,
          rebalanceTargets: applicableRule.redistributeTo,
          themesToExtract: applicableRule.themes
        };
      } else {
        // Fallback to generic rebalancing
        consolidatedCollections[oversizedList.name] = {
          name: `${oversizedList.name} [OVERSIZED]`,
          movieIds: oversizedList.movieIds,
          movieCount: oversizedList.size,
          type: 'oversized_needs_rebalancing',
          rebalanceRecommendation: `No genre-specific rule found. Manual review needed.`
        };
      }
    });
  }

  // Generate consolidation report
  generateReport() {
    const { smallLists, largeLists } = this.splitListsBySize();
    const { consolidatedCollections, unusedLists } = this.createThematicGroups();
    
    const preservedLists = Object.values(consolidatedCollections).filter(c => c.type === 'preserved_large_list');
    const newConsolidatedLists = Object.values(consolidatedCollections).filter(c => c.type === 'consolidated_from_small_lists');
    
    const report = {
      summary: {
        originalTotalLists: Object.keys(this.allLists).length,
        originalLargeLists: largeLists.length,
        originalSmallLists: smallLists.length,
        finalTotalLists: Object.keys(consolidatedCollections).length,
        preservedLargeLists: preservedLists.length,
        newConsolidatedLists: newConsolidatedLists.length,
        unusedSmallLists: unusedLists.length,
        moviesInSmallLists: smallLists.reduce((sum, l) => sum + l.size, 0),
        moviesInNewConsolidated: newConsolidatedLists.reduce((sum, c) => sum + c.movieCount, 0)
      },
      consolidatedCollections,
      unusedLists: unusedLists.map(l => ({ name: l.name, size: l.size })),
      recommendations: this.generateRecommendations(consolidatedCollections, unusedLists)
    };

    return report;
  }

  generateRecommendations(consolidated, unused) {
    return [
      "Consider creating additional consolidation rules for unused lists",
      "Some movies may need manual curation for better thematic fit",
      `${unused.length} small lists remain unconsolidated - may need genre-specific rules`,
      "Large lists (6+ movies) should be reviewed separately for over-consolidation",
      "Apply this process to other genres after refining rules"
    ];
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const genreArg = process.argv[2];
  if (!genreArg) {
    console.log("Usage: node consolidate-collections.js <genre>");
    console.log("Example: node consolidate-collections.js Musical");
    process.exit(1);
  }

  const buildStateFile = `./list-analysis-output/${genreArg.toLowerCase()}-build-state.json`;
  
  if (!fs.existsSync(buildStateFile)) {
    console.error(`Build state file not found: ${buildStateFile}`);
    process.exit(1);
  }

  console.log(`🎯 Analyzing ${genreArg} collections for consolidation...`);
  
  const consolidator = new CollectionConsolidator(buildStateFile);
  const report = consolidator.generateReport();
  
  console.log(`\n📊 CONSOLIDATION SUMMARY`);
  console.log(`========================`);
  console.log(`Original total lists: ${report.summary.originalTotalLists}`);
  console.log(`├─ Large lists (≥6 movies): ${report.summary.originalLargeLists} → preserved`);
  console.log(`└─ Small lists (<6 movies): ${report.summary.originalSmallLists} → ${report.summary.newConsolidatedLists} consolidated + ${report.summary.unusedSmallLists} unused`);
  console.log(`Final total collections: ${report.summary.finalTotalLists} (${((report.summary.finalTotalLists / report.summary.originalTotalLists) * 100).toFixed(1)}% of original)`);
  console.log(`Movies consolidated: ${report.summary.moviesInSmallLists} → ${report.summary.moviesInNewConsolidated}`);

  console.log(`\n🎬 FINAL COLLECTIONS`);
  console.log(`====================`);
  
  const preservedLists = Object.values(report.consolidatedCollections).filter(c => c.type === 'preserved_large_list');
  const newConsolidatedLists = Object.values(report.consolidatedCollections).filter(c => c.type === 'consolidated_from_small_lists');
  
  console.log(`\n✅ PRESERVED LARGE LISTS (${preservedLists.length}):`);
  preservedLists.slice(0, 10).forEach(collection => {
    console.log(`  • ${collection.name} (${collection.movieCount} movies)`);
  });
  if (preservedLists.length > 10) console.log(`  ... and ${preservedLists.length - 10} more`);
  
  console.log(`\n🔗 NEW CONSOLIDATED LISTS (${newConsolidatedLists.length}):`);
  newConsolidatedLists.forEach(collection => {
    console.log(`  • ${collection.name} (${collection.movieCount} movies)`);
    if (collection.sourceCollections) {
      console.log(`    Sources: ${collection.sourceCollections.slice(0, 3).join(', ')}${collection.sourceCollections.length > 3 ? '...' : ''}`);
    }
    if (collection.consolidationRule) {
      console.log(`    Keywords: ${collection.consolidationRule}`);
    }
    console.log();
  });

  // Save detailed report
  const outputFile = `./consolidation-report-${genreArg.toLowerCase()}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${outputFile}`);
}

export default CollectionConsolidator;