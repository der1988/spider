type Exchange=readonly [title:string,entrance:string,reply:string];

// Each block follows the featured species for its ten-level stage.
export const levelDialogues=[
  // Greenhouse · Pip and the gnats
  ['Pip','My permit says I can hover here indefinitely.','Did they tell you what indefinitely means to a spider?'],
  ['The Buzz Committee','We voted to intimidate you. The vote is still open.','I’ll start eating the abstentions.'],
  ['Minor Nuisance','We started a fan club. Membership is mandatory.','Fine. I’d like to meet the members individually.'],
  ['The Window Tax','There’s a toll for crossing this sill.','Do you take installments of one gnat?'],
  ['The Produce Aisle','We’re hiding in plain sight. Please look elsewhere.','You’ve appointed a very helpful spokesperson.'],
  ['Soft Launch','We’re doing a quiet debut. Tell everyone.','I’ll whisper it to the web.'],
  ['One More Buzz','Our encore is just the bit where you miss us.','Bold of you to put the ending in the title.'],
  ['The Low Ceilings','We keep our ambitions at a sensible height.','Excellent. I left my tall ambitions upstairs.'],
  ['The Seat Fillers','We’re only here until the important act arrives.','Then I’d better clear the seats.'],
  ['The Warm-Up Gnats','The Duke asked us to get you limber.','Did he specify which of us should stretch?'],
  // Wireworks · Zip and the darts
  ['Zip','My agent says I need a strong opening and no middle.','At that speed you might also skip the ending.'],
  ['Overtime','We’re paid by the sprint. Standing still is freelance.','How much do you get for running into a wall?'],
  ['The Split Seconds','We rehearsed the entrance on fast-forward.','I caught the part where you all went past the door.'],
  ['Brake Optional','Our brakes were cut for artistic reasons.','The far wall has volunteered to finish the scene.'],
  ['The Zip Codes','We’re mailing ourselves straight past you.','There’s a net for undeliverable packages.'],
  ['Rush Hour','We always leave room for a faster member to pass.','Perfect. I’ll set the table in the passing lane.'],
  ['A Brief Delay','One of us has to deliver the threat at normal speed.','Take your time. The others will be back shortly.'],
  ['The First Lap','We make up for poor judgment with excellent acceleration.','I’ve put that on the wall, where you’ll see it.'],
  ['Fast Company','Everyone gets a solo. Someone will have to catch the drummer.','How generous of you to assign me a part.'],
  ['The Late Arrivals','We got here early by missing three rehearsals.','That explains why only the entrance looks practiced.'],
  // Amber Hall · Mothilda and the veils
  ['Mothilda','My rider said the spotlight had to be flattering.','I’ve moved it to the furthest corner. You’ll love it.'],
  ['The Personal Space','We need a minimum distance from strangers.','All right. I’ll introduce the furniture first.'],
  ['The Empty Chairs','We vacate a seat as soon as someone walks toward it.','That makes you my favorite kind of audience.'],
  ['The Backpedals','Our exit strategy is identical to our introduction.','It must save a fortune on choreography.'],
  ['The Privacy Screens','We never agree to a close-up.','Good. Your director has eight legs and no zoom.'],
  ['Take Two Steps Back','That’s our band name and our only demand.','Catchy. I’ll catch you after the chorus.'],
  ['The Fire Drills','We’ve marked every place you’re likely to stand.','You missed the spot directly above the clipboard.'],
  ['The Reserved Seats','We sit in whichever row the ushers haven’t reached.','The ushers have booked a private matinee.'],
  ['Footnote','We only object to hands-on reviews.','Then I’ll review you with my feet.'],
  ['The Distant Relations','We’re very close. Geographically, we disagree.','I’ll stand here and see who leaves the family first.'],
  // Fern Vault · Peck and the skippers
  ['Peck','I requested a dressing room with three floors.','You got one room. The floors are up for negotiation.'],
  ['The Floor Plans','We call every shelf the ground floor.','No wonder the lift is having an identity crisis.'],
  ['Upstairs Again','Our signature move is correcting the seating chart mid-flight.','I’ve numbered the platforms. Please stop renaming them.'],
  ['The Dropouts','If the lead goes up, the understudy comes down.','Very efficient. The show delivers its own understudy.'],
  ['The Stacked Deck','We refuse to play at a fixed altitude.','And I refuse to put the net at a fixed opinion.'],
  ['Second Storey','We started on the first floor. It had critics.','They can still see you from the balcony.'],
  ['The Skylarks','We put the chorus above the verse. Literally.','That should give the rhyme a safe place to land.'],
  ['The Platform Shoes','We bought extra height with the rehearsal money.','At least the purchase is visible from the cheap seats.'],
  ['The Ceiling Bills','The floor was too expensive, so we moved our office up.','I hear the rent comes down eventually.'],
  ['The Flying Staircase','We added a step halfway through to surprise you.','It’s very difficult to applaud with a ladder in the way.'],
  // Cinder Loft · Dash and the comets
  ['Dash','Curves are a fad. I fly in a straight line.','I’ll put something at the end of the trend.'],
  ['The Rulers','We brought a straightedge in case anyone suggests improvising.','Good. Hold it while I measure the trap.'],
  ['One Way Only','Changing course would undermine our brand.','I’m relieved the collision is on message.'],
  ['The Runway Ends','We finish each number exactly where it’s going.','Has anyone told that to the wall?'],
  ['No Detours','We’re a direct service. There are no intermediate stops.','I’ve opened a stop and called it a surprise.'],
  ['The Point Blank','We threw out the score because it had a curved note.','That explains why the drums sound like impacts.'],
  ['Parallel Parking','Our turns have been postponed until the next tour.','The arena will remember you as a very long skid.'],
  ['The Straight Faces','Every punch line lands on the same spot.','I’m beginning to see why this is a trap comedy.'],
  ['The Horizon Line','The second we lose momentum, it becomes theatre.','The first row bought tickets for both outcomes.'],
  ['The Express Checkout','We’ve already paid for the shortest possible exit.','That’s an entrance fee to the web. Keep the receipt.'],
  // Rain Tank · Fern and the leafwings
  ['Fern','I decline all webs without a posted cancellation policy.','There’s a thirty-day window. This one closes in three seconds.'],
  ['The Fine Print','We inspected the net and found several suspicious strings.','I appreciate a review that mentions the materials.'],
  ['The Route Auditors','We found a safer way round every trap on your map.','Delightful. I can fold a map in more than one place.'],
  ['The Red Flags','We carry our own warning signs. Safety first.','Then you won’t mind if I move the hazards.'],
  ['The Exit Rows','On detecting a net, we all leave by different doors.','That ought to make the fire marshal start taking notes.'],
  ['The Loose Threads','We’ll walk when the contract contains a tie-in.','Walking would make a refreshing change. Please demonstrate.'],
  ['Preview Copies','We’d like to inspect the trap before accepting the part.','You can look. I’ve blocked out where you stand afterward.'],
  ['The Safe Bets','We’ve looked ahead and guaranteed a clean crossing.','I sell an umbrella for that sort of guarantee.'],
  ['Conditional Release','We’re here until someone finds a catch.','I hope whoever wrote that is checking both exits.'],
  ['The Unbinder','We formed the band to escape entanglements.','The opening number sounds wonderfully optimistic.'],
  // Spore Mill · Orbit and the loopers
  ['Orbit','May I circle back to that threat in a moment?','Certainly. I’m counting how many moments it takes.'],
  ['The Roundabouts','Our rehearsal room only had one corner.','You’ve made a surprisingly long career of avoiding it.'],
  ['The Second Circles','All our solos come back around. Twice if you clap.','I can set a web with one hand and not clap with seven.'],
  ['The Record Grooves','We’re touring the same few inches until the needle lifts.','I was wondering what held the song together.'],
  ['The Revolving Doors','Every exit is an entrance if you go far enough.','Convenient. I’ll only need to guard one of them.'],
  ['The Loop Holes','Our lawyer said we could get round the rules.','Do try to leave a hole where the rest of us can follow.'],
  ['The Spirographs','Our stage diagram looks like a flower having an argument.','I’ll hang it in the corridor where you keep passing.'],
  ['The Same Spot','We wanted a reunion tour but didn’t have a place to reunite.','I’ve seen you here six times. Call it a residency.'],
  ['The Orbits','We’re going to circle you until you become a planet.','For once I’d prefer the gravity to be metaphorical.'],
  ['The Long Way Round','We’ve saved the big finish for our third return.','Then I’ll save my silk for the cheap seats on the curve.'],
  // Dusk Circuit · Dusty and the drifters
  ['Dusty','I don’t fall. I descend in search of better reviews.','The floor has prepared a very short one.'],
  ['The Low Notes','Our best numbers always settle at the bottom.','That’s where I keep the encore.'],
  ['The Down Drafts','The producer asked for a lift. We submitted a descent.','It’s brave to ignore the only directional note.'],
  ['The Soft Landings','We’ve negotiated a gradual return to earth.','I’ve negotiated the seat underneath.'],
  ['The Heavy Air','We aimed for the top. It was further than advertised.','You can file a complaint when you get down here.'],
  ['The Sinking Feeling','We drift lower when a performance gets serious.','The closer you get, the more seriously I take it.'],
  ['The Bass Floor','Our drummer refuses to play anything above your knees.','At last, a production that respects my height.'],
  ['The Falling Out','The band split halfway up and settled the argument downstairs.','Would you like the disagreement in a net or on the floor?'],
  ['The Weight List','Gravity is now our manager. It takes a considerable cut.','I know. I’m meeting you at its office.'],
  ['The Matinee Drop','We wanted a slow fade but the room has a floor.','Then let’s try a fade with a booking at the bottom.'],
  // Copper Nest · Nibs and the needles
  ['Nibs','I treat a web as a coat check. I never stay long.','Then I’ll collect your ticket while you’re still wearing it.'],
  ['The Escape Clauses','We include a brief pause for legal departure.','I’ve learned to finish my paperwork while running.'],
  ['The Slim Chances','We can fit through the gap in a firm agreement.','Good. The agreement expires shortly. I’ll be right there.'],
  ['The Loose Fits','We had our costumes tailored for a quick exit.','I hope they left an allowance for silk.'],
  ['Missing Buttons','Everything we wear comes off in an emergency.','The net has asked for pockets. It likes a souvenir.'],
  ['The Short Hangs','We’ve arranged to be detained for less than a verse.','That’s why I won’t wait for the bridge.'],
  ['The Pin Drops','We’re so thin you’ll only hear one of us land.','I’m standing close enough to listen.'],
  ['Threadbare','We slipped out of the venue before anyone could pay us.','I can settle this while the doors are still open.'],
  ['The Fast Unknots','We have a knot expert. We never let him finish a solo.','Then you and I can both keep this short.'],
  ['The Exit Interviews','We’d rather give a statement after we wriggle out.','Let’s discuss your time here while you still have some.'],
  // Moon Core · Glow and the lanterns
  ['Glow','I can spot a web from under my good lighting.','I was hoping you’d look at the bad lighting too.'],
  ['The Spotlight Tax','We charge extra for flying near anything suspicious.','I’ll try not to inhale on the more expensive side.'],
  ['The Dark Gaps','We keep a generous distance from any net we notice.','That should leave you just enough room to notice the next one.'],
  ['The Exit Lights','We memorized all the detours while you were hanging the silk.','Good. Let me show you the part I hung since then.'],
  ['The Lantern Troupe','The lead insists that stars must never be seen near a trap.','Your understudy has been very candid about that.'],
  ['The Reflected Glory','We refuse to cross anywhere that ruins our reflection.','A flattering exit would be such a useful place for a net.'],
  ['The Moon Guides','We navigate by keeping every obvious web at arm’s length.','With your arms, that’s an alarming unit of measure.'],
  ['The Bright Ideas','We agreed to avoid all the well-lit hazards first.','I appreciate your support for the understudies in the dark.'],
  ['Last Light','Our final trick is making you look at the wrong side.','I’ve noticed. I’m using the other seven eyes.'],
  ['The Grand Buzz','We put the final escape route in our souvenir program.','You sold me a copy at the door. I’ve marked the ending.'],
] as const satisfies readonly Exchange[];

export function dialogueFor(level:number) {
  return levelDialogues[level-1];
}

export function deliverySeconds(line:string) {
  return Math.max(2.25,1.05+line.split(' ').length*.195);
}

export const levelEntranceSeconds=.66;
export function levelIntroDuration(level:number) {
  const [,line,reply]=dialogueFor(level);
  return levelEntranceSeconds+deliverySeconds(line)+deliverySeconds(reply);
}
