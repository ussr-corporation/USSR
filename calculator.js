// Function to calculate adjusted price based on years
function getAdjustedPrice(basePrice, years) {
  let increaseRate = 0;
  if (years === 1) increaseRate = 0.04;
  else if (years === 3) increaseRate = 0.10;
  else if (years === 5) increaseRate = 0.15;

  const finalPrice = basePrice + basePrice * increaseRate;
  const monthlyPayment = finalPrice / (years * 12);

  return {
    years: years,
    finalPrice: finalPrice.toFixed(2),
    monthlyPayment: monthlyPayment.toFixed(2),
  };
}

// Mock battery price fetch
async function getBatteryPriceFromExcel() {
  return 5000; // Simulated battery price
}

// Off-grid system calculation
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
  let numPanels = Math.ceil((stationPower * 1000) / panelWattage);
  if (numPanels % 2 !== 0) numPanels += 1;

  let finalPowerStation = (numPanels * panelWattage) / 1000;
  let totalPanelPrice = numPanels * panelPrice;

  let batteryVoltage;
  if (finalPowerStation < 1.2) batteryVoltage = 12;
  else if (finalPowerStation < 2.4) batteryVoltage = 24;
  else if (finalPowerStation < 4.8) batteryVoltage = 48;
  else batteryVoltage = 240;

  let AHreq = (energyConsumption * 1000 * autonomyDays) /
    (invEfficiency * DOD * chargeEfficiency * batteryVoltage);
  let totalBatteries = Math.ceil(AHreq / batteryAH);
  let totalBatteryPrice = totalBatteries * batteryPrice;

  let totalSystemPrice = totalPanelPrice + totalBatteryPrice;

  return {
    numPanels,
    totalBatteries,
    totalSystemPrice,
    batteryVoltage
  };
}

// Panel options
const panelOptions = [
  { id: 1, name: 'Panel 1', wattage: 300, price: 1500 },
  { id: 2, name: 'Panel 2', wattage: 400, price: 2000 },
  { id: 3, name: 'Panel 3', wattage: 500, price: 2500 }
];

// Handle form submission
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById("solar-calculator");
  const resultDiv = document.getElementById("result");

  if (!form || !resultDiv) {
    console.error("Required HTML elements not found.");
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const energyInput = document.getElementById("energy-consumption").value;
    const billInput = document.getElementById("highest-bill").value;

    if (!energyInput || !billInput) {
      alert("Please enter both energy consumption and highest bill.");
      return;
    }

    const monthlyConsumption = parseFloat(energyInput);
    const energyConsumption = monthlyConsumption / 30;
    const highestBill = parseFloat(billInput);

    // System constants
    const psh = 5.5;
    const sf = 1.25;
    const invEfficiency = 0.92;
    const DOD = 0.5;
    const chargeEfficiency = 0.95;
    const autonomyDays = 2;
    const batteryAH = 200;

    const batteryPrice = await getBatteryPriceFromExcel();

    // Calculate for each panel
    const allResults = [];

    for (const panel of panelOptions) {
      const results = calculateOffGridSystem(
        energyConsumption,
        panel.wattage,
        panel.price,
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
      let paybackPeriod = results.totalSystemPrice / annualSavings;
      paybackPeriod = Math.min(paybackPeriod, 10); // Cap at 10 years

      allResults.push({
        ...results,
        panelName: panel.name,
        panelWattage: panel.wattage,
        paybackPeriod: paybackPeriod.toFixed(1)
      });
    }

    // Find the least expensive system
    const cheapestSystem = allResults.reduce((min, curr) =>
      curr.totalSystemPrice < min.totalSystemPrice ? curr : min
    );

    // Generate comparison HTML with "Best Value" badge
    let resultsHTML = `<h3>Your Solar Solutions</h3>`;

    allResults.forEach(result => {
      const isBest = result.totalSystemPrice === cheapestSystem.totalSystemPrice;
      const bestValueBadge = isBest ? '<span class="best-value">Best Value</span>' : '';

      resultsHTML += `
        <div class="system-option${isBest ? ' best-option' : ''}">
          <h4>${result.panelName} ${bestValueBadge}</h4>
          <div class="system-details">
            <p><strong>System Size:</strong> ${(result.numPanels * result.panelWattage / 1000).toFixed(1)} kW</p>
            <p><strong>Solar Panels:</strong> ${result.numPanels} × ${result.panelWattage}W panels</p>
            <p><strong>Battery Bank:</strong> ${result.totalBatteries} × ${batteryAH}Ah batteries (${result.batteryVoltage}V system)</p>
            <p><strong>Total System Cost:</strong> EGP ${result.totalSystemPrice.toLocaleString('en-EG')}</p>
            <p><strong>Estimated Payback Period:</strong> ${result.paybackPeriod} - ${(parseFloat(result.paybackPeriod) + 1).toFixed(1)} years</p>
          </div>
        </div>
      `;
    });

    // Installment plans based on cheapest system
    const plans = [1, 3, 5];
    let plansHTML = `<div class="plans-section"><h3>Installment Plans</h3>`;
    plans.forEach(year => {
      const plan = getAdjustedPrice(cheapestSystem.totalSystemPrice, year);
      plansHTML += `
        <div class="plan">
          <p><strong>${plan.years}-Year Plan</strong></p>
          <p>Total Price: EGP ${plan.finalPrice}</p>
          <p>Monthly: EGP ${plan.monthlyPayment}</p>
        </div>
      `;
    });
    plansHTML += `</div>`;

    // Render final output
    resultDiv.innerHTML = `
      ${resultsHTML}
      ${plansHTML}
      <p class="disclaimer">Note: Calculations are estimates. Actual system may vary based on site conditions.</p>
    `;

    resultDiv.style.display = 'block';
  });
});
