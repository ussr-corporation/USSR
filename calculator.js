const XLSX = require("xlsx");
const path = require("path");

// Function to calculate adjusted price based on years
function getAdjustedPrice(basePrice, years) {
    let increaseRate = 0;

    if (years === 1) {
        increaseRate = 0.04;
    } else if (years === 3) {
        increaseRate = 0.10;
    } else if (years === 5) {
        increaseRate = 0.15;
    }

    const finalPrice = basePrice + (basePrice * increaseRate);
    const monthlyPayment = finalPrice / (years * 12);

    return {
        years: years,
        finalPrice: finalPrice.toFixed(2),
        monthlyPayment: monthlyPayment.toFixed(2),
    };
}

// Async function to fetch battery price from Excel (stub)
async function getBatteryPriceFromExcel() {
    try {
        console.log("Simulating Excel fetch - using default battery price");
        return 5000;
    } catch (error) {
        console.error("Error fetching battery price:", error);
        return 5000;
    }
}

// Async function to fetch Panel 1 price from Excel
async function getPanelPriceFromExcel(panelName = "Panel 1") {
    try {
        const filePath = path.join(__dirname, "ExcelIgnited.xlsx");
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets["Sheet1"];
        const data = XLSX.utils.sheet_to_json(sheet);

        const panel = data.find(row => row["Unnamed: 0"] === panelName);
        return panel?.Price ?? 6399.5;
    } catch (error) {
        console.error("Error fetching panel price from Excel:", error);
        return 6399.5;
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
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("solar-calculator").addEventListener("submit", async function (event) {
        event.preventDefault();

        let energyInput = document.getElementById("energy-consumption").value;
        let billInput = document.getElementById("highest-bill").value;

        if (!energyInput || !billInput) {
            alert("Please enter both energy consumption and highest bill.");
            return;
        }

        let monthlyConsumption = parseFloat(energyInput);
        let energyConsumption = monthlyConsumption / 30;
        let highestBill = parseFloat(billInput);

        // Parameters
        const panelWattage = 550;
        const panelPrice = await getPanelPriceFromExcel("Panel 1");
        const psh = 5.5;
        const sf = 1.25;
        const invEfficiency = 0.92;
        const DOD = 0.5;
        const chargeEfficiency = 0.95;
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
        let paybackPeriod = (results.totalSystemPrice / annualSavings).toFixed(1);
        let adjustedPayback = Math.min(parseFloat(paybackPeriod), 10);

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
                <p><strong>Estimated Payback Period:</strong> ${adjustedPayback} years</p>
            </div>
            ${plansHTML}
            <p class="disclaimer">Note: Calculations are estimates. Actual system may vary based on site conditions.</p>
        `;

        document.getElementById("result").style.display = 'block';
    });
});
