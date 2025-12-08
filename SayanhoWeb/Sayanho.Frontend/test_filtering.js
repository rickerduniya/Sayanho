const availableProperties = [
    {
        "Type": "TPN SFU",
        "Enclosure": "Sheet steel enclosure",
        "Current Rating": "32A",
        "Mounting ": "Flat Iron frame",
        "Voltage": "415V - TPN",
        "Company": "Siemens",
        "Rate": "3904",
        "Description": "Desc 1",
        "GS": "GS 1"
    },
    {
        "Type": "Normal",
        "Enclosure": "Sheet steel",
        "Current Rating": "125 A ",
        "Mounting ": "Angle iron frame",
        "Voltage": "415V - TPN",
        "Company": "Anchor",
        "Rate": "4223",
        "Description": "Desc 2",
        "GS": "GS 2"
    }
];

const getFilteredOptions = (key, currentValues) => {
    if (availableProperties.length === 0) return [];

    const allKeys = Object.keys(availableProperties[0]).filter(k => k !== "Item" && k !== "Rate" && k !== "Description" && k !== "GS");
    const keyIndex = allKeys.indexOf(key);

    if (keyIndex === -1) return [];

    const precedingKeys = allKeys.slice(0, keyIndex);

    console.log(`Calculating options for '${key}'`);
    console.log(`Preceding keys: ${JSON.stringify(precedingKeys)}`);
    console.log(`Current values: ${JSON.stringify(currentValues)}`);

    const filteredRows = availableProperties.filter(row => {
        return precedingKeys.every(prevKey => {
            const selectedValue = currentValues[prevKey];
            const match = !selectedValue || row[prevKey] === selectedValue;
            if (!match) {
                // console.log(`Row failed on ${prevKey}: expected '${selectedValue}', got '${row[prevKey]}'`);
            }
            return match;
        });
    });

    console.log(`Filtered rows count: ${filteredRows.length}`);
    const options = Array.from(new Set(filteredRows.map(r => r[key]).filter(Boolean)));
    return options.sort();
};

// Scenario 1: Initial state (TPN SFU)
let currentValues = {
    "Type": "TPN SFU",
    "Enclosure": "Sheet steel enclosure",
    "Mounting ": "Flat Iron frame",
    "Current Rating": "32A",
    "Voltage": "415V - TPN",
    "Company": "Siemens"
};

console.log("--- Scenario 1: Initial TPN SFU ---");
console.log("Mounting options:", getFilteredOptions("Mounting ", currentValues));

// Scenario 2: User changes Type to "Normal"
// Enclosure and others retain old values
currentValues["Type"] = "Normal";

console.log("\n--- Scenario 2: Changed Type to Normal ---");
// Enclosure is "Sheet steel enclosure" (from TPN SFU).
// But "Normal" requires "Sheet steel".
// So Enclosure mismatch?
console.log("Enclosure options:", getFilteredOptions("Enclosure", currentValues));

// If user selects "Sheet steel" for Enclosure
currentValues["Enclosure"] = "Sheet steel";

console.log("\n--- Scenario 3: Changed Enclosure to Sheet steel ---");
// Current Rating is still "32A" (from TPN SFU).
// But "Normal" requires "125 A ".
// Since "Current Rating" is BEFORE "Mounting ", it is a preceding key.
// So filtering for Mounting will check Current Rating="32A".
console.log("Mounting options:", getFilteredOptions("Mounting ", currentValues));
