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

    const finalPrice = basePrice + (basePrice * increaseRate);
    const monthlyPayment = finalPrice / (years * 12);

    return {
        years: years,
        finalPrice: finalPrice.toFixed(2),
        monthlyPayment: monthlyPayment.toFixed(2),
    };
}

// Async function to fetch battery price from Excel
async function getBatteryPriceFromExcel() {
    try {
        // For demonstration, we'll use a mock value
        // In production, replace with actual Excel file loading
        console.log("Simulating Excel fetch - using default battery price");
        return 5000; // Default battery price in EGP
    } catch (error) {
        console.error("Error fetching battery price:", error);
        return 5000; // Fallback value
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

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("solar-calculator").addEventListener("submit", async function(event) {
        event.preventDefault();

        let energyInput = document.getElementById("energy-consumption").value;
        let billInput = document.getElementById("highest-bill").value;

        if (!energyInput || !billInput) {
            alert("Please enter both energy consumption and highest bill.");
            return;
        }

        let monthlyConsumption = parseFloat(energyInput);
        let energyConsumption = monthlyConsumption / 30; // Convert to daily
        let highestBill = parseFloat(billInput);

        // System parameters
        const panelWattage = 550; // Updated to more modern panel size
        const panelPrice =  6,399.5; // EGP per panel
        const psh = 5.5; // Peak sun hours
        const sf = 1.25; // Safety factor
        const invEfficiency = 0.92; // Inverter efficiency
        const DOD = 0.5; // Depth of discharge
        const chargeEfficiency = 0.95; // Charge controller efficiency
        const autonomyDays = 2; // Days of autonomy
        const batteryAH = 200; // Battery capacity in AH

        // Fetch battery price
        const batteryPrice = await getBatteryPriceFromExcel();

        // Calculate system details
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

        // Calculate payback period (years)
        const annualSavings = highestBill * 12 * 0.7; // Assuming 30% savings
        const paybackPeriod = (results.totalSystemPrice / annualSavings).toFixed(1);

        // Generate installment plans
        const plans = [1, 3, 5];
        let plansHTML = `<div class="plans-section"><h3>Installment Plans</h3>`;
        plans.forEach(year => {
            const plan = getAdjustedPrice(results.totalSystemPrice, year);
            plansHTML += `
                <div class="plan">
                    <p><strong>${plan.years}-Year Plan</strong></p>
                    <p>Total Price: EGP ${plan.finalPrice}</p>
                    <p>Monthly: EGP ${plan.monthlyPayment}</p>
                </div>
            `;
        });
        plansHTML += `</div>`;

        // Display results
        document.getElementById("result").innerHTML = `
            <h3>Your Solar Solution</h3>
            <div class="system-details">
                <p><strong>System Size:</strong> ${(results.numPanels * panelWattage / 1000).toFixed(1)} kW</p>
                <p><strong>Solar Panels:</strong> ${results.numPanels} × ${panelWattage}W panels</p>
                <p><strong>Battery Bank:</strong> ${results.totalBatteries} × ${batteryAH}Ah batteries (${results.batteryVoltage}V system)</p>
                <p><strong>Total System Cost:</strong> EGP ${results.totalSystemPrice.toLocaleString('en-EG')}</p>
                <p><strong>Estimated Payback Period:</strong> ${paybackPeriod} years</p>
            </div>
            ${plansHTML}
            <p class="disclaimer">Note: Calculations are estimates. Actual system may vary based on site conditions.</p>
        `;

        // Show results
        document.getElementById("result").style.display = 'block';
    });
});
