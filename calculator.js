// Function to calculate adjusted price based on years
function getAdjustedPrice(basePrice, years) {
  let increaseRate = 0;

  if (years === 1) {
    increaseRate = 0.04; // 4% increase for 1 year
  } else if (years === 3) {
    increaseRate = 0.10; // 10% increase for 3 years
  } else if (years === 5) {
    increaseRate = 0.15; // 15% increase for 5 years
  }

  const finalPrice = basePrice + basePrice * increaseRate;
  const monthlyPayment = finalPrice / (years * 12);

  return {
    years: years,
    finalPrice: finalPrice.toFixed(2),
    monthlyPayment: monthlyPayment.toFixed(2),
  };
}

// Async function to fetch panel price from Excel
async function getPanelPrice() {
  try {
    const response = await fetch('ExcelIgnited.xlsx'); // Adjust the path
    if (!response.ok) throw new Error("Failed to load file");

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = workbook.SheetNames[0]; // Modify if needed
    const sheet = workbook.Sheets[sheetName];

    const cellAddress = 'D2'; // Change this to your specific price cell
    const price = sheet[cellAddress] ? sheet[cellAddress].v : 'Not Found';

    return Number(price) || 0; // Ensure it's a number, fallback to 0
  } catch (error) {
    console.error("Error fetching Excel:", error);
    return 0;
  }
}

// Function to calculate off-grid solar system requirements
function calculateOffGridSystem(
  energyConsumption,
  panelWattage,
  panelPrice,
  psh,
  sf,
  invEfficiency,
  DOD,
  chargeEfficiency,
  autonomyDays,
  batteryAH,
  batteryPrice
) {
  let stationPower = (energyConsumption * sf) / (invEfficiency * psh);
  let numPanels = Math.ceil(stationPower * 1000 / panelWattage);

  // Ensure number of panels is even
  if (numPanels % 2 !== 0) {
    numPanels += 1;
  }

  let finalPowerStation = numPanels * panelWattage / 1000;
  let totalPanelPrice = numPanels * panelPrice;

  let batteryVoltage;
  if (finalPowerStation < 1.2) batteryVoltage = 12;
  else if (finalPowerStation < 2.4) batteryVoltage = 24;
  else if (finalPowerStation < 4.8) batteryVoltage = 48;
  else batteryVoltage = 240;

  let AHreq =
    (energyConsumption * 1000 * autonomyDays) /
    (invEfficiency * DOD * chargeEfficiency * batteryVoltage);
  let numBranches = Math.ceil(AHreq / batteryAH);
  let totalBatteries = numBranches;

  let totalBatteryPrice = totalBatteries * batteryPrice;
  let totalSystemPrice = totalPanelPrice + totalBatteryPrice;

  return { numPanels, totalBatteries, totalSystemPrice };
}

// Function to handle form submission
document.getElementById("solar-calculator").addEventListener("submit", async function (event) {
  event.preventDefault(); // Prevent form from refreshing the page

  // Get user inputs
  let energyConsumption = parseFloat(document.getElementById("energy-consumption").value) / 30; // Convert monthly to daily
  let highestBill = parseFloat(document.getElementById("highest-bill").value); // User's highest electric bill

  // Solar system parameters
  let panelWattage = 250; // Panel wattage in watts
  let panelPrice = 100; // Example price per panel in USD
  let psh = 6; // Peak Sun Hours
  let sf = 1.15; // Safety Factor
  let invEfficiency = 0.85; // Inverter Efficiency

  // Battery parameters
  let DOD = 0.8; // Depth of Discharge
  let chargeEfficiency = 0.7; // Charge Efficiency
  let autonomyDays = 2; // Number of autonomy days
  let batteryAH = 200; // Battery capacity in amp-hours

  // Fetch battery price from Excel
  let batteryPrice = await getPanelPrice();

  // Calculate off-grid system requirements
  let results = calculateOffGridSystem(
    energyConsumption,
    panelWattage,
    panelPrice,
    psh,
    sf,
    invEfficiency,
    DOD,
    chargeEfficiency,
    autonomyDays,
    batteryAH,
    batteryPrice
  );

  // Calculate payback period (in years)
  let paybackPeriod = results.totalSystemPrice / (highestBill * 12);
  let paybackRangeStart = Math.floor(paybackPeriod);
  let paybackRangeEnd = Math.ceil(paybackPeriod);
  let paybackPeriodFormatted = from ${paybackRangeStart} years to ${paybackRangeEnd} years;

  // Display results
  let resultContainer = document.getElementById("result");
  resultContainer.innerHTML = `
    <p>Number of Panels: <strong>${results.numPanels}</strong></p>
    <p>Total Number of Batteries: <strong>${results.totalBatteries}</strong></p>
    <p>Total System Cost: <strong>\$${results.totalSystemPrice.toFixed(2)}</strong></p>
    <p>Payback Period: <strong>${paybackPeriodFormatted}</strong></p>
  `;
});
