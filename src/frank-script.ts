export type FrankLine={speaker:string;narration:boolean;text:string};
export type FrankChapter={location:string;title:string;enemies:{name:string;species:string;hits:number}[];before:FrankLine[];after:FrankLine[]};

export const frankChapters:FrankChapter[]=[
  {
    "location": "The Knock in the Rain",
    "title": "The Knock in the Rain",
    "enemies": [],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "It was raining. The kind of rain that made you question your life choices. Especially if you'd chosen to live outside."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "I'd seen corruption, betrayal, and things no spider should ever see. Although having eight eyes made that statistically inevitable."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Then a stranger appeared. I was hoping he'd bring a case. Or an umbrella."
      },
      {
        "speaker": "STRANGER",
        "narration": false,
        "text": "I've heard about you, Mr. Webbin."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I can explain."
      },
      {
        "speaker": "STRANGER",
        "narration": false,
        "text": "I hear you're a good detective."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Good. I was beginning to think I'd started that rumour for nothing."
      },
      {
        "speaker": "STRANGER",
        "narration": false,
        "text": "I have a job for you."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What kind of job?"
      },
      {
        "speaker": "STRANGER",
        "narration": false,
        "text": "An investigation. Everything you need is in this envelope."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "And my payment?"
      },
      {
        "speaker": "STRANGER",
        "narration": false,
        "text": "Half now, half when the job is done."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Finally. A man who understands detective work."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Benny Blabber was a small fish in a small pond. Technically, he wasn't even a fish."
      }
    ],
    "after": []
  },
  {
    "location": "Clover Bank",
    "title": "A Small Fish",
    "enemies": [
      {
        "name": "Benny Blabber",
        "species": "Gnat",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Benny knew everything that happened in the garden. And quite a few things that hadn't."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Benny Blabber."
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "Frank! Whatever you've heard, it's not true."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I haven't heard anything."
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "Especially about the mayor's wife."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm investigating a murder."
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "Oh. That's considerably better."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I need you to answer a few questions."
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "I'd rather not."
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What happened here, Benny?"
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "I didn't kill anyone."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Then who did?"
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "I don't know. But I've been talking to a couple of couriers."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Where can I find them?"
      },
      {
        "speaker": "BENNY",
        "narration": false,
        "text": "Poppy Crossing."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Benny wasn't a murderer. But whoever he'd been talking to might know something about one."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "I headed for Poppy Crossing."
      }
    ]
  },
  {
    "location": "Poppy Crossing",
    "title": "Special Delivery",
    "enemies": [
      {
        "name": "Eddie Flapper",
        "species": "Dart",
        "hits": 1
      },
      {
        "name": "Freddie Flapper",
        "species": "Gnat",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Eddie and Freddie Flapper specialized in discreet deliveries. Neither of them knew what discreet meant."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Eddie. Freddie."
      },
      {
        "speaker": "EDDIE",
        "narration": false,
        "text": "Are you expecting a delivery?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm expecting some answers."
      },
      {
        "speaker": "FREDDIE",
        "narration": false,
        "text": "We don't deliver those."
      },
      {
        "speaker": "EDDIE",
        "narration": false,
        "text": "Company policy."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Then we'll have to make an exception."
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What were you delivering?"
      },
      {
        "speaker": "EDDIE",
        "narration": false,
        "text": "We don't open the packages."
      },
      {
        "speaker": "FREDDIE",
        "narration": false,
        "text": "Not anymore."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What was inside?"
      },
      {
        "speaker": "FREDDIE",
        "narration": false,
        "text": "Documents. Lots of numbers."
      },
      {
        "speaker": "EDDIE",
        "narration": false,
        "text": "We delivered them to The Reedbed. That's all we know."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Confidential documents, mysterious deliveries, and numbers. I was beginning to suspect an accountant."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "I'd always found them suspicious."
      }
    ]
  },
  {
    "location": "The Reedbed",
    "title": "Nothing to Declare",
    "enemies": [
      {
        "name": "Doris Doublecross",
        "species": "Veil",
        "hits": 1
      },
      {
        "name": "Douglas Doublecross",
        "species": "Dart",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Twenty years of marriage and they still finished each other's sentences. Occasionally, the prison system did too."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Doris. Douglas. Am I interrupting something?"
      },
      {
        "speaker": "DORIS",
        "narration": false,
        "text": "It's our anniversary."
      },
      {
        "speaker": "DOUGLAS",
        "narration": false,
        "text": "Twenty wonderful years."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Congratulations."
      },
      {
        "speaker": "DOUGLAS",
        "narration": false,
        "text": "Thank you."
      },
      {
        "speaker": "DORIS",
        "narration": false,
        "text": "Now, darling, shall we get rid of him?"
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Where are the documents?"
      },
      {
        "speaker": "DOUGLAS",
        "narration": false,
        "text": "Are you comfortable, darling?"
      },
      {
        "speaker": "DORIS",
        "narration": false,
        "text": "Perfectly, sweetheart."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "The documents."
      },
      {
        "speaker": "DORIS",
        "narration": false,
        "text": "Fern Stair. We delivered them yesterday."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "In a garden full of betrayal and corruption, it was nice to see two criminals who genuinely loved each other."
      }
    ]
  },
  {
    "location": "Fern Stair",
    "title": "Organized Accounting",
    "enemies": [
      {
        "name": "Bernard Bugshot",
        "species": "Skipper",
        "hits": 1
      },
      {
        "name": "Edgar Sixpence",
        "species": "Veil",
        "hits": 1
      },
      {
        "name": "Martin Flymore",
        "species": "Gnat",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "They had revolutionized organized crime by introducing meetings. Crime rates had fallen considerably. Nobody had time to commit any."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Gentlemen. We need to talk."
      },
      {
        "speaker": "BERNARD",
        "narration": false,
        "text": "Is this meeting scheduled?"
      },
      {
        "speaker": "EDGAR",
        "narration": false,
        "text": "I don't have it in my calendar."
      },
      {
        "speaker": "MARTIN",
        "narration": false,
        "text": "Shall I send an invitation?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm already here."
      },
      {
        "speaker": "MARTIN",
        "narration": false,
        "text": "Excellent. Everyone's accepted."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm here for the financial records."
      },
      {
        "speaker": "BERNARD",
        "narration": false,
        "text": "Gentlemen, we have a security issue."
      },
      {
        "speaker": "EDGAR",
        "narration": false,
        "text": "Is it covered by our insurance?"
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "You've been bribing police officers."
      },
      {
        "speaker": "BERNARD",
        "narration": false,
        "text": "Bribery is a very strong word."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What would you call it?"
      },
      {
        "speaker": "EDGAR",
        "narration": false,
        "text": "A subscription."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Where are they?"
      },
      {
        "speaker": "MARTIN",
        "narration": false,
        "text": "Toadstool Ring."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "I'd started with a dead client. Now I had financial records, three criminals, and a police department I couldn't trust. Corruption was everywhere. At least someone was getting paid regularly in this town."
      }
    ]
  },
  {
    "location": "Toadstool Ring",
    "title": "Above the Lawn",
    "enemies": [
      {
        "name": "Captain Buzzkill",
        "species": "Comet",
        "hits": 1
      },
      {
        "name": "Officer Mothball",
        "species": "Dart",
        "hits": 1
      },
      {
        "name": "Officer Drowsywing",
        "species": "Skipper",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "They were the finest officers money could buy. I had the receipts to prove it."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Captain Buzzkill. Still on duty?"
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "Technically."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "When are you retiring?"
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "Emotionally, about fifteen years ago."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I've got evidence that you've been taking bribes."
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "Can't this wait until after my retirement?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "No."
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "Shame."
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What can you tell me about the murder at Clover Bank?"
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "Nothing. I read about it in the newspaper."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "You're the police."
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "I was equally surprised."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Where are the official records?"
      },
      {
        "speaker": "BUZZKILL",
        "narration": false,
        "text": "Dewfall."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Someone had made sure the death at Clover Bank was never properly investigated. The answers were waiting for me at Dewfall."
      }
    ]
  },
  {
    "location": "Dewfall",
    "title": "Dead on Paper",
    "enemies": [
      {
        "name": "Rupert Buzzpress",
        "species": "Leafwing",
        "hits": 2
      },
      {
        "name": "Harold Flyline",
        "species": "Veil",
        "hits": 1
      },
      {
        "name": "Jimmy Flashwing",
        "species": "Dart",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "They believed in freedom of the press. Particularly the freedom to make things up."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "You published something that wasn't true."
      },
      {
        "speaker": "RUPERT",
        "narration": false,
        "text": "Could you be more specific?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "It was in yesterday's newspaper."
      },
      {
        "speaker": "RUPERT",
        "narration": false,
        "text": "That doesn't narrow it down much."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm talking about the murder at Clover Bank."
      },
      {
        "speaker": "RUPERT",
        "narration": false,
        "text": "That was a very successful story."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I need to see your sources."
      },
      {
        "speaker": "RUPERT",
        "narration": false,
        "text": "I'm afraid that's not possible."
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "This article was written the day before the murder."
      },
      {
        "speaker": "RUPERT",
        "narration": false,
        "text": "We're a very efficient newspaper."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Who gave you the story?"
      },
      {
        "speaker": "RUPERT",
        "narration": false,
        "text": "It came through an intermediary at Birch Fork."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Someone had written the ending before the story had even begun. I needed to find out who."
      }
    ]
  },
  {
    "location": "Birch Fork",
    "title": "A Question of Trust",
    "enemies": [
      {
        "name": "Mayor Goldwing",
        "species": "Looper",
        "hits": 2
      },
      {
        "name": "Arthur Flipwing",
        "species": "Comet",
        "hits": 1
      },
      {
        "name": "Walter Honeytongue",
        "species": "Skipper",
        "hits": 1
      },
      {
        "name": "Gordon Flyright",
        "species": "Leafwing",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Mayor Goldwing was a man of his word. Unfortunately, his word changed every election."
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "Mr. Webbin. What brings you here?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I've been talking to Benny Blabber."
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "Whatever he told you about my wife is completely untrue."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "He didn't tell me anything."
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "Good. Then it's even less true."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm investigating a murder."
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "I have political immunity."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "From what?"
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "Ideally, everything."
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Why did you arrange for that article to be published?"
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "We were paid to deliver a message. Nothing more."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Before the murder?"
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "Before you were even hired, Mr. Webbin."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Who paid you?"
      },
      {
        "speaker": "GOLDWING",
        "narration": false,
        "text": "The people at Rose Thicket."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "Someone knew I was going to investigate a murder before I even knew there was going to be one."
      }
    ]
  },
  {
    "location": "Rose Thicket",
    "title": "Former Detectives",
    "enemies": [
      {
        "name": "Harvey Blindfly",
        "species": "Drifter",
        "hits": 2
      },
      {
        "name": "Richard Falsewing",
        "species": "Looper",
        "hits": 2
      },
      {
        "name": "Stanley Spybug",
        "species": "Skipper",
        "hits": 1
      },
      {
        "name": "Gordon Flycatch",
        "species": "Comet",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "We'd all started in the same profession. They'd gone into organized crime. I'd stayed in disorganized detective work."
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "Still a private detective, Frank?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Still a criminal, Harvey?"
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "We prefer to think of ourselves as former detectives."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I prefer to think of you as future prisoners."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm investigating the murder at Clover Bank."
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "Still calling it a murder?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What would you call it?"
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "A mistake. Yours."
      }
    ],
    "after": [
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Did you kill my client?"
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "No."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "Do you know who did?"
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "Do you know that anyone did?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What are you trying to tell me?"
      },
      {
        "speaker": "HARVEY",
        "narration": false,
        "text": "Go to Autumn Tangle. And start thinking like a detective again."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "I'd spent the entire investigation looking for a murderer. It had never occurred to me to look for a victim."
      }
    ]
  },
  {
    "location": "Autumn Tangle",
    "title": "The Usual Suspects",
    "enemies": [
      {
        "name": "Don Buzzarella",
        "species": "Lantern",
        "hits": 3
      },
      {
        "name": "Carlo Stingano",
        "species": "Needle",
        "hits": 2
      },
      {
        "name": "Sal Leafone",
        "species": "Leafwing",
        "hits": 1
      },
      {
        "name": "Rocco Loopetti",
        "species": "Looper",
        "hits": 1
      },
      {
        "name": "Vinnie Flyspeed",
        "species": "Comet",
        "hits": 1
      }
    ],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "They believed in family values. Most of those values were kept in offshore accounts."
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "You come here uninvited, Mr. Webbin."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I didn't know I needed an invitation."
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "This is a private gathering."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I'm a private detective."
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "That's not how it works."
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "Years of preparation. Months of negotiations. And then you came along."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "What were you planning?"
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "Something you'll never live to see."
      }
    ],
    "after": [
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "Our informants. Our couriers. Our documents. Our allies. You've taken everything from us."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "I was investigating a murder."
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "No, Mr. Webbin. You were dismantling an organization."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "On whose behalf?"
      },
      {
        "speaker": "BUZZARELLA",
        "narration": false,
        "text": "You'll find him at Moonflower."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "There was one name missing from the investigation. One final piece of the puzzle. I headed for Moonflower."
      }
    ]
  },
  {
    "location": "Moonflower",
    "title": "The Perfect Crime",
    "enemies": [],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "I'd spent my life catching flies. Somewhere along the way, I'd forgotten that spiders could catch each other."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "Mr. Webbin. I believe I owe you some money."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "We've met before?"
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "Half now, half when the job is done. Remember?"
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "You were supposed to be dead."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "I never said that."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "They were going to betray me, Frank. Every last one of them."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "The financial records."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "Evidence they intended to use against me."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "And I collected it for you."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "Along with everyone who knew about it."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "You used me."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "I employed you. There's a difference."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "Congratulations, Frank. You've eliminated my competition."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "There's still one criminal left."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "Surely we can come to an arrangement."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "We can. You're under arrest."
      }
    ],
    "after": [
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "You've made quite a name for yourself today, Frank."
      },
      {
        "speaker": "FRANK",
        "narration": false,
        "text": "So have you."
      },
      {
        "speaker": "DUKE",
        "narration": false,
        "text": "The difference is that tomorrow, everyone will know yours."
      }
    ]
  },
  {
    "location": "The Wanted Spider",
    "title": "The Wanted Spider",
    "enemies": [],
    "before": [
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "According to The Garden Times, I was the criminal mastermind behind everything that had happened."
      },
      {
        "speaker": "FRANK",
        "narration": true,
        "text": "It was the most flattering article anyone had ever written about me."
      }
    ],
    "after": []
  }
];
