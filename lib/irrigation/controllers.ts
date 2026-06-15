export interface ControllerStep {
  step: number;
  title: string;
  instruction: string;
  tip?: string;
  warning?: string;
}

export interface ControllerGuide {
  brand: string;
  model: string;
  aliases: string[];
  type: "residential" | "commercial" | "smart";
  zones_max: number;
  two_wire: boolean;
  wifi: boolean;
  programming: {
    set_time: ControllerStep[];
    set_watering: ControllerStep[];
    manual_run: ControllerStep[];
    rain_delay: ControllerStep[];
  };
  solenoid_compatibility: string[];
  common_issues: string[];
  image_keywords: string[];
}

export const CONTROLLER_DATABASE: ControllerGuide[] = [
  {
    brand: "Hunter",
    model: "Pro-C",
    aliases: ["ProC", "Pro C"],
    type: "residential",
    zones_max: 15,
    two_wire: false,
    wifi: false,
    programming: {
      set_time: [
        { step: 1, title: "Turn dial to SET TIME", instruction: "Rotate the dial clockwise to the SET TIME position.", tip: "Dial has a raised arrow indicator." },
        { step: 2, title: "Set hours", instruction: "Press + or - buttons to set the current hour.", tip: "Hold button for fast scroll." },
        { step: 3, title: "Press RIGHT arrow", instruction: "Press the right arrow button to advance to minutes." },
        { step: 4, title: "Set minutes", instruction: "Press + or - to set current minutes." },
        { step: 5, title: "Set AM/PM", instruction: "Press right arrow again and use + or - to select AM or PM." },
        { step: 6, title: "Set day", instruction: "Press right arrow to advance to day of week. Use + or - to set." },
        { step: 7, title: "Return dial to RUN", instruction: "Rotate dial back to RUN position. Time is saved automatically." },
      ],
      set_watering: [
        { step: 1, title: "Turn dial to SET RUN TIMES", instruction: "Rotate dial to SET RUN TIMES." },
        { step: 2, title: "Select program", instruction: "Use A/B/C buttons to select program A, B, or C.", tip: "Use Program A for standard lawn zones." },
        { step: 3, title: "Set zone runtime", instruction: "Station 1 displays first. Use + or - to set run time in minutes.", tip: "Set 0 to skip a station." },
        { step: 4, title: "Advance through stations", instruction: "Press right arrow to move to next station. Repeat for all zones." },
        { step: 5, title: "Turn dial to SET START TIMES", instruction: "Rotate dial to SET START TIMES." },
        { step: 6, title: "Set start time", instruction: "Use + or - to set first start time. Press right arrow to add additional start times if needed.", warning: "Each start time runs the full program. One start time per day is usually sufficient." },
        { step: 7, title: "Turn dial to SET DAYS", instruction: "Rotate dial to SET DAYS." },
        { step: 8, title: "Select watering days", instruction: "Use + or - to toggle each day ON or OFF. Right arrow advances through days.", tip: "EVEN/ODD options available for water restriction compliance." },
        { step: 9, title: "Return to RUN", instruction: "Rotate dial to RUN. Programming is complete." },
      ],
      manual_run: [
        { step: 1, title: "Turn dial to MANUAL — ONE STATION", instruction: "Rotate dial to MANUAL — ONE STATION for single zone test." },
        { step: 2, title: "Select station", instruction: "Use + or - to select the zone number you want to test." },
        { step: 3, title: "Set run time", instruction: "Press right arrow and use + or - to set test run time." },
        { step: 4, title: "Press right arrow to start", instruction: "Press right arrow again to begin. Zone activates immediately.", tip: "Watch for valve click and head pop-up." },
      ],
      rain_delay: [
        { step: 1, title: "Turn dial to RAIN DELAY", instruction: "Rotate dial to RAIN DELAY." },
        { step: 2, title: "Set delay days", instruction: "Use + or - to set number of days to delay (1-7 days)." },
        { step: 3, title: "Return to RUN", instruction: "Rotate to RUN. Controller skips watering for selected days." },
      ],
    },
    solenoid_compatibility: ["Hunter", "Rain Bird", "Toro", "Irritrol"],
    common_issues: [
      "Battery backup dies — controller loses programming",
      "Module slots crack with age — check for visible damage",
      "Display fades — replace battery first",
    ],
    image_keywords: ["hunter pro-c", "hunter controller gray", "hunter irrigation timer"],
  },
  {
    brand: "Hunter",
    model: "X2",
    aliases: ["X-2", "HunterX2"],
    type: "residential",
    zones_max: 6,
    two_wire: false,
    wifi: false,
    programming: {
      set_time: [
        { step: 1, title: "Rotate dial to DATE/TIME", instruction: "Turn dial to DATE/TIME position." },
        { step: 2, title: "Set day of week", instruction: "Use + or - to set current day." },
        { step: 3, title: "Set hour and minutes", instruction: "Press right arrow to advance through hour and minutes fields. Use + or - for each." },
        { step: 4, title: "Return to RUN", instruction: "Rotate dial to RUN." },
      ],
      set_watering: [
        { step: 1, title: "Rotate to STATION RUN TIMES", instruction: "Turn dial to STATION RUN TIMES." },
        { step: 2, title: "Set each zone", instruction: "Each station displays in sequence. Use + or - to set minutes (0-120)." },
        { step: 3, title: "Rotate to START TIMES", instruction: "Set one or more start times per program." },
        { step: 4, title: "Rotate to WATER DAYS", instruction: "Select specific days or interval watering." },
        { step: 5, title: "Return to RUN", instruction: "Rotate dial to RUN." },
      ],
      manual_run: [
        { step: 1, title: "Rotate to MANUAL ZONE", instruction: "Turn dial to MANUAL ZONE." },
        { step: 2, title: "Press + to start zone 1", instruction: "Use + or - to select zone. Zone runs immediately." },
      ],
      rain_delay: [
        { step: 1, title: "Rotate to RAIN DELAY", instruction: "Set delay days with + or - buttons." },
        { step: 2, title: "Return to RUN", instruction: "Delay is active until days expire." },
      ],
    },
    solenoid_compatibility: ["Hunter", "Rain Bird", "Toro"],
    common_issues: ["Simple 6-zone unit — often installed by builders", "No seasonal adjust — consider upgrade for water savings"],
    image_keywords: ["hunter x2", "hunter small controller", "hunter 6 zone"],
  },
  {
    brand: "Hunter",
    model: "Hydrawise",
    aliases: ["Hydrawise", "Hunter HC", "Hunter HCC"],
    type: "smart",
    zones_max: 52,
    two_wire: false,
    wifi: true,
    programming: {
      set_time: [
        { step: 1, title: "Open Hydrawise app", instruction: "Time syncs automatically via Wi-Fi. No manual setting required.", tip: "If time is wrong, check Wi-Fi connection status on controller display." },
      ],
      set_watering: [
        { step: 1, title: "Open Hydrawise app or web portal", instruction: "Go to app or hydrawise.com and log in." },
        { step: 2, title: "Select controller", instruction: "Tap your controller name from the dashboard." },
        { step: 3, title: "Tap Zones", instruction: "View all zones listed. Tap a zone to edit." },
        { step: 4, title: "Set run time and frequency", instruction: "Set watering duration and days per zone. Predictive Watering auto-adjusts based on weather.", tip: "Enable Smart Watering for ET-based auto scheduling." },
        { step: 5, title: "Save", instruction: "Changes push to controller automatically over Wi-Fi." },
      ],
      manual_run: [
        { step: 1, title: "App — tap zone", instruction: "Tap any zone in app and select Run Now." },
        { step: 2, title: "Controller — press Run", instruction: "On the controller faceplate, press and hold RUN for 3 seconds, then select zone with arrow buttons." },
      ],
      rain_delay: [
        { step: 1, title: "App — tap Suspend", instruction: "In app dashboard, tap Suspend Watering and select delay period." },
        { step: 2, title: "Predictive Watering", instruction: "If Smart Watering is enabled, rain delays apply automatically based on forecast.", tip: "Check Hydrawise weather station assignment in settings." },
      ],
    },
    solenoid_compatibility: ["Hunter", "Rain Bird", "Toro", "Irritrol", "Weathermatic"],
    common_issues: [
      "Wi-Fi connection drops — check 2.4GHz band (5GHz not supported)",
      "App sync delays — clear app cache and force-close app, then reopen",
      "Account login required after controller reset — keep credentials saved",
    ],
    image_keywords: ["hydrawise", "hunter hcc", "hunter smart controller", "hydrawise wifi"],
  },
  {
    brand: "Rain Bird",
    model: "ESP-Me",
    aliases: ["ESP-Me", "RainBird ESP", "ESP Me", "Rain Bird ESP"],
    type: "residential",
    zones_max: 22,
    two_wire: false,
    wifi: false,
    programming: {
      set_time: [
        { step: 1, title: "Press and hold NEXT", instruction: "Press and hold the NEXT button until the display blinks." },
        { step: 2, title: "Set day of week", instruction: "Use the + or - buttons to set the current day. Press NEXT to advance." },
        { step: 3, title: "Set month, day, year", instruction: "Use + or - for each field. Press NEXT to advance through each." },
        { step: 4, title: "Set hour and minutes", instruction: "Use + or - to set time. AM/PM toggles when scrolling past 12." },
        { step: 5, title: "Return to RUN", instruction: "Press NEXT until display returns to normal operation." },
      ],
      set_watering: [
        { step: 1, title: "Rotate dial to RUN TIMES", instruction: "Turn the large dial to RUN TIMES position." },
        { step: 2, title: "Select program", instruction: "Press PROG button to choose Program A, B, C, or D.", tip: "Program A is standard. Use B-D for separate areas or seasonal schedules." },
        { step: 3, title: "Set zone run time", instruction: "Station 1 displays first. Use + or - to set minutes (0-240). Set 0 to skip." },
        { step: 4, title: "Advance through stations", instruction: "Press NEXT to move to the next station. Repeat for all active zones." },
        { step: 5, title: "Rotate to START TIMES", instruction: "Turn dial to START TIMES. Use + or - to set first start time.", warning: "Each start time runs the full program. One start time per day is standard." },
        { step: 6, title: "Rotate to WATERING DAYS", instruction: "Toggle each day ON or OFF with + or -." },
        { step: 7, title: "Return to AUTO RUN", instruction: "Rotate dial to AUTO RUN. Schedule is now active." },
      ],
      manual_run: [
        { step: 1, title: "Rotate to MANUAL", instruction: "Turn dial to MANUAL ALL STATIONS or SINGLE STATION." },
        { step: 2, title: "Press NEXT", instruction: "Press NEXT to start. Use SINGLE STATION to test one zone.", tip: "Use SINGLE STATION for field diagnosis." },
      ],
      rain_delay: [
        { step: 1, title: "Rotate to RAIN DELAY", instruction: "Turn dial to RAIN DELAY position." },
        { step: 2, title: "Set delay days", instruction: "Use + or - to set 1-7 days of delay." },
        { step: 3, title: "Return to AUTO RUN", instruction: "Rotate dial to AUTO RUN." },
      ],
    },
    solenoid_compatibility: ["Rain Bird", "Hunter", "Toro", "Irritrol"],
    common_issues: [
      "Memory loss after power outage — verify battery backup is installed",
      "Zone skip — check for 0:00 run time setting on skipped station",
      "Dial position can slip — push firmly and listen for click when rotating",
    ],
    image_keywords: ["rain bird esp-me", "rain bird controller", "rainbird esp timer"],
  },
  {
    brand: "Orbit",
    model: "B-Hyve",
    aliases: ["B-Hyve", "B Hyve", "Orbit BHyve", "Orbit Smart"],
    type: "smart",
    zones_max: 12,
    two_wire: false,
    wifi: true,
    programming: {
      set_time: [
        { step: 1, title: "Download B-Hyve app", instruction: "Install the Orbit B-Hyve app (iOS or Android). Create or log into your Orbit account." },
        { step: 2, title: "Connect to Wi-Fi", instruction: "On controller, hold Wi-Fi button until LED blinks. Follow app pairing instructions." },
      ],
      set_watering: [
        { step: 1, title: "Open B-Hyve app", instruction: "Tap your controller." },
        { step: 2, title: "Tap Programs", instruction: "Create or edit a watering program." },
        { step: 3, title: "Set zones, duration, and schedule", instruction: "Add zones to program, set run time per zone, set start time and frequency." },
        { step: 4, title: "Save program", instruction: "Program pushes to controller automatically." },
      ],
      manual_run: [
        { step: 1, title: "App — tap Manual", instruction: "Tap zone and select Manual Run. Set duration and start." },
        { step: 2, title: "Controller — press zone button", instruction: "Press zone number button on faceplate, then press run." },
      ],
      rain_delay: [
        { step: 1, title: "App — tap Rain Delay", instruction: "Tap the rain cloud icon in app dashboard. Set delay hours." },
      ],
    },
    solenoid_compatibility: ["Orbit", "Hunter", "Rain Bird", "Toro"],
    common_issues: [
      "Wi-Fi drops on 5GHz — ensure 2.4GHz connection",
      "App sync delays — force close and reopen app",
    ],
    image_keywords: ["orbit b-hyve", "orbit wifi controller", "orbit bhyve"],
  },
  {
    brand: "Irritrol",
    model: "Custom Command",
    aliases: [
      "Custom Command", "Irritrol CC",
      // Older Irritrol model names — all share the same button-based programming pattern
      "Irritrol", "Total Control", "TC", "Irritrol TC",
      "DDS", "DDS-B", "Irritrol DDS",
      "MC+", "MC Plus", "Irritrol MC",
      "Deluxe", "Irritrol Deluxe",
      "KIS", "Irritrol KIS",
      "730", "740", "750",
    ],
    type: "residential",
    zones_max: 12,
    two_wire: false,
    wifi: false,
    programming: {
      set_time: [
        { step: 1, title: "Press and hold SET", instruction: "Hold the SET button (or PROG on some models) until the time display blinks.", tip: "On DDS and TC models the button may be labeled PROG instead of SET." },
        { step: 2, title: "Set hours", instruction: "Use + or - to set the current hour. Press SET (or PROG) to advance to minutes." },
        { step: 3, title: "Set minutes and AM/PM", instruction: "Use + or - for each field. Press SET to confirm and return to normal display." },
      ],
      set_watering: [
        { step: 1, title: "Press PROG button", instruction: "Select program A or B. On older models press PROG repeatedly to cycle." },
        { step: 2, title: "Navigate to run times", instruction: "Press SET until the station run time display blinks. Station 1 appears first.", tip: "On Total Control and DDS models you may see STA or STATION on the display." },
        { step: 3, title: "Set zone run time", instruction: "Use + or - to set minutes per zone. Press SET to advance to the next station." },
        { step: 4, title: "Set start time", instruction: "Press SET until START or a clock icon appears. Use + or - to set the start hour and minutes." },
        { step: 5, title: "Set watering days", instruction: "Press SET until DAYS appears. Use + or - to toggle each day ON or OFF." },
        { step: 6, title: "Press RUN", instruction: "Press RUN or AUTO to exit programming and return to normal operation.", tip: "Display should show current time when programming is complete." },
      ],
      manual_run: [
        { step: 1, title: "Press MANUAL button", instruction: "Press and hold MANUAL for 2 seconds until zone number appears.", tip: "On some Irritrol models hold TEST or press MANUAL once — display blinks." },
        { step: 2, title: "Select zone", instruction: "Use + or - to select zone number. The selected zone activates immediately." },
        { step: 3, title: "Stop zone", instruction: "Press OFF or RUN to end manual operation.", warning: "If no OFF button, turn controller dial to OFF and back to RUN." },
      ],
      rain_delay: [
        { step: 1, title: "Press RAIN DELAY", instruction: "Press the RAIN DELAY button (labeled DELAY on some models).", tip: "Not all older Irritrol models have a dedicated rain delay button — if missing, set all zone run times to 0 for manual rain hold." },
        { step: 2, title: "Set delay days", instruction: "Use + or - to set 1-7 days. Press SET to confirm." },
      ],
    },
    solenoid_compatibility: ["Irritrol", "Hunter", "Rain Bird", "Toro"],
    common_issues: [
      "Older units lose all programming on power outage — no battery backup",
      "Button membrane failures on high-use units — buttons feel soft or don't register",
      "DDS models: display fades on one side — capacitor issue, unit may need replacement",
      "Total Control: door hinge cracks over time — use tape to secure door",
    ],
    image_keywords: ["irritrol custom command", "irritrol controller", "irritrol timer", "irritrol total control", "irritrol dds"],
  },
  {
    brand: "Imperial",
    model: "EasySet",
    aliases: [
      "Imperial", "Imperial EasySet", "Imperial IC",
      "IC-6", "IC-12", "Imperial IC6", "Imperial IC12",
      "Imperial 6", "Imperial 12", "Imperial Easy Set",
      "Imperial controller", "Imperial irrigation",
    ],
    type: "residential",
    zones_max: 12,
    two_wire: false,
    wifi: false,
    programming: {
      set_time: [
        { step: 1, title: "Press and hold SET/TIME button", instruction: "Press and hold the SET or TIME button for 3 seconds until the time display blinks.", tip: "Imperial models vary — button may be labeled SET TIME, TIME, or just SET." },
        { step: 2, title: "Set hours", instruction: "Use the + or - (or UP/DOWN) buttons to set the current hour. The display shows AM or PM." },
        { step: 3, title: "Press SET to advance to minutes", instruction: "Press SET once to move to minutes. Use + or - to set minutes." },
        { step: 4, title: "Confirm and return", instruction: "Press SET one more time or wait 5 seconds for display to stop blinking and save.", tip: "If display returns to current time, time is saved." },
      ],
      set_watering: [
        { step: 1, title: "Press PROGRAM or PROG button", instruction: "Press PROGRAM to enter scheduling mode. Some models display PROG A or PROG 1.", tip: "Imperial controllers typically have one or two programs." },
        { step: 2, title: "Navigate to zone run times", instruction: "Press SET or use arrow buttons to navigate to STATION or ZONE display. Station 1 shows first." },
        { step: 3, title: "Set zone run time", instruction: "Use + or - to set run time in minutes (0 = skip). Press SET or arrow to advance to the next zone." },
        { step: 4, title: "Set start time", instruction: "Navigate to START TIME. Use + or - to set hour and minutes. AM/PM toggles as you scroll past 12.", warning: "Set only one start time unless multiple daily cycles are needed — each start runs all zones." },
        { step: 5, title: "Set watering days", instruction: "Navigate to DAYS or SCHEDULE. Use + or - to toggle each day. Some models use ODD/EVEN or INTERVAL settings." },
        { step: 6, title: "Press RUN or AUTO", instruction: "Press RUN, AUTO, or the main dial to AUTO to activate the schedule.", tip: "The display should return to showing current time." },
      ],
      manual_run: [
        { step: 1, title: "Press MANUAL or TEST button", instruction: "Press and hold MANUAL or TEST for 2-3 seconds. Zone number appears on display.", tip: "Some Imperial models have a TEST ALL button that runs every zone for a short cycle." },
        { step: 2, title: "Select zone", instruction: "Use + or - to choose zone number. Zone activates within a few seconds." },
        { step: 3, title: "Stop manual run", instruction: "Press OFF, RUN, or AUTO to end the manual cycle.", warning: "Always return to AUTO/RUN after testing or the system won't water on schedule." },
      ],
      rain_delay: [
        { step: 1, title: "Locate RAIN DELAY or DELAY button", instruction: "Press RAIN DELAY if available. On models without this button, set controller to OFF for manual rain hold.", tip: "Many basic Imperial models do not have a dedicated rain delay feature." },
        { step: 2, title: "Set delay period", instruction: "Use + or - to select delay hours or days. Press SET to confirm.", warning: "Remember to return to AUTO after the rain delay period if the controller doesn't do it automatically." },
      ],
    },
    solenoid_compatibility: ["Imperial", "Hunter", "Rain Bird", "Orbit", "Toro"],
    common_issues: [
      "No battery backup — all programming lost on power outage",
      "Button labels fade with age — photograph the controller label before it's unreadable",
      "Display contrast fades in heat — unit may look blank but still be powered",
      "Imperial brand discontinued — replacement parts unavailable; consider upgrading to Hunter X2 or Rain Bird ESP-Me",
    ],
    image_keywords: ["imperial controller", "imperial irrigation timer", "imperial ic6", "imperial easytext", "imperial sprinkler timer"],
  },
  {
    brand: "Richdell",
    model: "Slide Series",
    aliases: ["Richdell Slide", "Richdell RC", "Richdell"],
    type: "residential",
    zones_max: 9,
    two_wire: false,
    wifi: false,
    programming: {
      set_time: [
        { step: 1, title: "Locate time slider", instruction: "The 24-hour dial on the controller face represents the current time. Rotate the outer dial until the current time aligns with the pointer.", tip: "This is a mechanical dial — no buttons needed for time setting." },
      ],
      set_watering: [
        { step: 1, title: "Set program pins", instruction: "Push program pins IN on the 24-hour dial to set watering start times. Each pin represents 15 minutes." },
        { step: 2, title: "Set zone run times", instruction: "For each zone slider, slide the duration lever to set run time in minutes." },
        { step: 3, title: "Set watering days", instruction: "Use the day-skip wheel to select which days the system waters.", tip: "Older mechanical systems — very reliable once set." },
      ],
      manual_run: [
        { step: 1, title: "Turn zone dial to ON", instruction: "Rotate individual zone dial to MANUAL or ON position." },
        { step: 2, title: "Return to AUTO when done", instruction: "Return zone dial to AUTO after testing." },
      ],
      rain_delay: [
        { step: 1, title: "Manual bypass only", instruction: "Older Richdell units have no rain delay. Turn master dial to OFF position for manual rain hold.", warning: "Remember to turn back to AUTO after rain passes." },
      ],
    },
    solenoid_compatibility: ["Richdell", "Hunter", "Rain Bird"],
    common_issues: [
      "Mechanical dial slips — realign time pointer",
      "Program pins stuck — gently press with pen tip",
      "No battery backup — power outage resets mechanical dial position",
    ],
    image_keywords: ["richdell controller", "richdell slide timer", "older irrigation controller mechanical"],
  },
  {
    brand: "Weathermatic",
    model: "SmartLine SL",
    aliases: ["SmartLine", "SL1600", "SL800", "SL4"],
    type: "smart",
    zones_max: 16,
    two_wire: false,
    wifi: true,
    programming: {
      set_time: [
        { step: 1, title: "Press MENU", instruction: "From main screen, press MENU button." },
        { step: 2, title: "Navigate to Date/Time", instruction: "Use arrow keys to select Date/Time. Press ENTER." },
        { step: 3, title: "Set values", instruction: "Use up/down to change each field. Press ENTER to advance." },
      ],
      set_watering: [
        { step: 1, title: "Press MENU — Programs", instruction: "Select Schedule from Programs menu." },
        { step: 2, title: "Select zone", instruction: "Choose zone and set run time using arrow keys." },
        { step: 3, title: "Set start time", instruction: "Navigate to Start Times. Enter time with arrow keys." },
        { step: 4, title: "Enable SmartWater", instruction: "SmartLine auto-adjusts based on ET data from onsite weather sensor.", tip: "Ensure weather sensor is connected and positioned correctly for best results." },
      ],
      manual_run: [
        { step: 1, title: "Press MANUAL on faceplate", instruction: "Select zone with arrow keys. Press ENTER to start." },
      ],
      rain_delay: [
        { step: 1, title: "Press MENU — Rain Delay", instruction: "Set delay hours or days. Automatic via weather sensor if connected." },
      ],
    },
    solenoid_compatibility: ["Weathermatic", "Hunter", "Rain Bird", "Toro"],
    common_issues: [
      "Weather sensor calibration drift — recalibrate annually",
      "SmartLink communication issues — check antenna connection",
    ],
    image_keywords: ["weathermatic smartline", "weathermatic controller", "weathermatic SL"],
  },
];

export function findController(query: string): ControllerGuide | null {
  const q = query.toLowerCase();
  return (
    CONTROLLER_DATABASE.find(
      (c) =>
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q))
    ) ?? null
  );
}

export function getAllBrands(): string[] {
  return [...new Set(CONTROLLER_DATABASE.map((c) => c.brand))];
}
