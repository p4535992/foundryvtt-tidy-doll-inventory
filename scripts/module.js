// SPDX-FileCopyrightText: 2020 Cody Swendrowski
//
// SPDX-License-Identifier: MIT

import DollInventorySheet from "./sheet/DollInventorySheet.mjs";
import { dollConfig } from "./config.js";

Hooks.once('init', async function () {
    CONFIG.debug.hooks = true;



    Actors.registerSheet("dnd5e", DollInventorySheet, {
        types: ["character"],
        makeDefault: true,
    });
});

Hooks.once('ready', async function () {

});
Hooks.on("renderItemSheet", async function (sheet, html, options) {

    //setting flags on items for dollInventory if none

    let inventoryLocations = await sheet.item.getFlag("tidy-doll-inventory", "inventoryLocations");
    if (!inventoryLocations) {
        let locations = dollConfig.inventory;
        for (let loc in locations) {
            locations[loc].available = false;
        }
        await sheet.item.setFlag("tidy-doll-inventory", "inventoryLocations",
            locations
        )
        inventoryLocations = await sheet.item.getFlag("tidy-doll-inventory", "inventoryLocations");
    }

    // adding the location selector on the sheet;

    let htmlElement = await renderTemplate("modules/tidy-doll-inventory/templates/itemLocationSelector.hbs", inventoryLocations);
    let form=html.find("form")
    html.find('.sheet-header').append(htmlElement);

    // flaggin locations on change checkboxes
    /*
    for (let check of html.find("input[data-location]")) {
        console.log(check);
        check.addEventListener('change', async function () {
            let location = check.dataset.location;
            inventoryLocations[location].available = check.checked;

            console.log(check, inventoryLocations);
            await sheet.item.setFlag("tidy-doll-inventory", "inventoryLocations",
                inventoryLocations
            )
        })
    }
    */
    console.log(form)

})