// Function to calculate adjusted price based on years
function getAdjustedPrice(basePrice, years) {
  let increaseRate = years === 1 ? 0.04 : years === 3 ? 0.10 : 0.15;
  const finalPrice = basePrice + basePrice * increaseRate;
  const monthlyPayment = finalPrice / (years * 12);

  return {
    years,
    finalPrice: finalPrice.toFixed(2),
    monthlyPayment: monthlyPayment.toFixed(2),
  };
}

// Async function to fetch battery price from Excel file
async function getBatteryPriceFromExcel() {
  try {
    const response = await fetch('ExcelIgnited.xlsx');
    if (!response.ok) throw new Error("Failed to load Excel file");

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const cellAddress = 'D2'; // Adjust as needed
    const price = sheet[cellAddress]?.v ?? 0;

    return Number(price) || 0;
  } catch (error) {
    console.error("Error reading Excel file:", error);
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
  const stationPower = (energyConsumption * sf) / (invEfficiency * psh);
  let numPanels = Math.ceil((stationPower * 1000) / panelWattage);
  if (numPanels % 2 !== 0) numPanels += 1;

  const finalPowerKW = (numPanels * panelWattage) / 1000;
  const totalPanelPrice = numPanels * panelPrice;

  let batteryVoltage = finalPowerKW < 1.2 ? 12 :
                       finalPowerKW < 2.4 ? 24 :
                       finalPowerKW < 4.8 ? 48 : 240;

  const AHreq = (energyConsumption * 1000 * autonomyDays) /
                (invEfficiency * DOD * chargeEfficiency * batteryVoltage);

  const totalBatteries = Math.ceil(AHreq / batteryAH);
  const totalBatteryPrice = totalBatteries * batteryPrice;
  const totalSystemPrice = totalPanelPrice + totalBatteryPrice;

  return {
    numPanels,
    totalBatteries,
    totalSystemPrice,
    finalPowerKW,
    batteryVoltage
  };
}

// Handle form submission
document.getElementById("solar-calculator").addEventListener("submit", async function (event) {
  event.preventDefault();

  const energyInput = parseFloat(document.getElementById("energy-consumption").value);
  const highestBill = parseFloat(document.getElementById("highest-bill").value);

  if (!energyInput || !highestBill) {
    alert("Please enter both values.");
    return;
  }

  const energyConsumption = energyInput / 30;

  // System assumptions
  const panelWattage = 250;
  const panelPrice = 100; // You can update this to a dynamic fetch if needed
  const psh = 6;
  const sf = 1.15;
  const invEfficiency = 0.85;
  const DOD = 0.8;
  const chargeEfficiency = 0.7;
  const autonomyDays = 2;
  const batteryAH = 200;

  const batteryPrice = await getBatteryPriceFromExcel();

  const results = calculateOffGridSystem(
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

  const annualSavings = highestBill * 12 * 0.7;
  const paybackPeriod = results.totalSystemPrice / annualSavings;
  const paybackRange = `From ${Math.floor(paybackPeriod)} to ${Math.ceil(paybackPeriod)} years`;

  // Generate installment plans
  const plans = [1, 3, 5].map(years => getAdjustedPrice(results.totalSystemPrice, years));

  // Show result
  const resultContainer = document.getElementById("result");
  resultContainer.innerHTML = `
    <h3>Your Solar System Design</h3>
    <p><strong>System Size:</strong> ${results.finalPowerKW.toFixed(2)} kW</p>
    <p><strong>Number of Panels:</strong> ${results.numPanels} × ${panelWattage}W</p>
    <p><strong>Total Batteries:</strong> ${results.totalBatteries} × ${batteryAH}Ah (${results.batteryVoltage}V)</p>
    <p><strong>Total System Cost:</strong> EGP ${results.totalSystemPrice.toFixed(2)}</p>
    <p><strong>Estimated Payback Period:</strong> ${paybackRange}</p>
    <h4>Installment Plans</h4>
    <ul>
      ${plans.map(p => `<li><strong>${p.years} years</strong>: Total EGP ${p.finalPrice}, Monthly EGP ${p.monthlyPayment}</li>`).join('')}
    </ul>
    <p class="disclaimer">* These are estimates. Actual performance may vary.</p>
  `;
});
