const XLSX = require("xlsx");
const path = require("path");

async function getAllPanelPrices() {
    try {
        const filePath = path.join(__dirname, "ExcelIgnited.xlsx");
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets["Sheet1"];
        const data = XLSX.utils.sheet_to_json(sheet);

        const panelPrices = {
            "Panel 1": data.find(row => row["Unnamed: 0"] === "Panel 1")?.Price ?? 6399.5,
            "Panel 2": data.find(row => row["Unnamed: 0"] === "Panel 2")?.Price ?? 5800.0,
            "Panel 3": data.find(row => row["Unnamed: 0"] === "Panel 3")?.Price ?? 7200.0
        };

        return panelPrices;
    } catch (error) {
        console.error("Error fetching panel prices:", error);
        return {
            "Panel 1": 6399.5,
            "Panel 2": 5800.0,
            "Panel 3": 7200.0
        };
    }
}

async function getBatteryPriceFromExcel() {
    try {
        console.log("Simulating Excel fetch - using default battery price");
        return 5000;
    } catch (error) {
        console.error("Error fetching battery price:", error);
        return 5000;
    }
}

function getAdjustedPrice(basePrice, years) {
    let increaseRate = 0;
    if (years === 1) increaseRate = 0.04;
    else if (years === 3) increaseRate = 0.10;
    else if (years === 5) increaseRate = 0.15;

    const finalPrice = basePrice + (basePrice * increaseRate);
    const monthlyPayment = finalPrice / (years * 12);

    return {
        years: years,
        finalPrice: finalPrice.toFixed(2),
        monthlyPayment: monthlyPayment.toFixed(2),
    };
}

function calculateSystemForPanel(
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

    let AHreq = (energyConsumption * 1000 * autonomyDays) / (invEfficiency * DOD * chargeEfficiency * batteryVoltage);
    let totalBatteries = Math.ceil(AHreq / batteryAH);
    let totalBatteryPrice = totalBatteries * batteryPrice;

    let totalSystemPrice = totalPanelPrice + totalBatteryPrice;

    return {
        numPanels,
        totalBatteries,
        totalSystemPrice,
        batteryVoltage,
        totalPowerKW: finalPowerStation
    };
}

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
        const psh = 5.5;
        const sf = 1.25;
        const invEfficiency = 0.92;
        const DOD = 0.5;
        const chargeEfficiency = 0.95;
        const autonomyDays = 2;
        const batteryAH = 200;
        const panelWattages = {
            "Panel 1": 550,
            "Panel 2": 450,
            "Panel 3": 650
        };

        const batteryPrice = await getBatteryPriceFromExcel();
        const panelPrices = await getAllPanelPrices();

        let resultsHTML = `<h3>Your Solar Solution</h3>`;

        for (let panelName of ["Panel 1", "Panel 2", "Panel 3"]) {
            const panelWatt = panelWattages[panelName];
            const panelPrice = panelPrices[panelName];

            const result = calculateSystemForPanel(
                energyConsumption,
                panelWatt,
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
            let paybackPeriod = (result.totalSystemPrice / annualSavings).toFixed(1);
            let adjustedPayback = Math.min(parseFloat(paybackPeriod), 10);

            let plansHTML = `<div class="plans-section"><h4>${panelName} Installment Plans</h4>`;
            [1, 3, 5].forEach(year => {
                const plan = getAdjustedPrice(result.totalSystemPrice, year);
                plansHTML += `
                    <div class="plan">
                        <p><strong>${year}-Year Plan</strong></p>
                        <p>Total Price: EGP ${plan.finalPrice}</p>
                        <p>Monthly: EGP ${plan.monthlyPayment}</p>
                    </div>
                `;
            });
            plansHTML += `</div>`;

            resultsHTML += `
                <div class="system-details">
                    <h4>${panelName} Design</h4>
                    <p><strong>System Size:</strong> ${result.totalPowerKW.toFixed(1)} kW</p>
                    <p><strong>Panels:</strong> ${result.numPanels} × ${panelWatt}W</p>
                    <p><strong>Battery Bank:</strong> ${result.totalBatteries} × ${batteryAH}Ah (${result.batteryVoltage}V)</p>
                    <p><strong>Total System Cost:</strong> EGP ${result.totalSystemPrice.toLocaleString('en-EG')}</p>
                    <p><strong>Estimated Payback Period:</strong> ${adjustedPayback} years</p>
                    ${plansHTML}
                </div>
            `;
        }

        resultsHTML += `<p class="disclaimer">Note: All estimates depend on actual site conditions and may vary.</p>`;
        document.getElementById("result").innerHTML = resultsHTML;
        document.getElementById("result").style.display = 'block';
    });
});
