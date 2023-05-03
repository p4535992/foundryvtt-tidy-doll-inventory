// SPDX-FileCopyrightText: 2020 Cody Swendrowski
//
// SPDX-License-Identifier: MIT

import DollInventorySheet from "./sheet/DollInventorySheet.mjs";
import { dollConfig } from "./config.js";

Hooks.once('init', async function () {
    CONFIG.debug.hooks = true;


    //registering the doll sheet

    Actors.registerSheet("dnd5e", DollInventorySheet, {
        types: ["character"],
        makeDefault: true,
    });

    //loading templates
    loadTemplates([
        'modules/tidy-doll-inventory/templates/sheet-config.hbs'
    ])

    //settings
    game.settings.register("tidy-doll-inventory", "playersCanSetSlot", {

        name: "allow players to set inventory slot",
        hint: "if checked, the players would be allowed to set inventory slots available for items on the item sheet",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

});

Hooks.once('ready', async function () {

});
Hooks.on("renderItemSheet", async function (sheet, html, options) {

    //setting flags on items for dollInventory if none

    let inventoryLocations = await sheet.item.getFlag("tidy-doll-inventory", "inventoryLocations");

    //creating dollInventory flag object if none
    if (!inventoryLocations) {
        let locations = dollConfig.inventory;
        for (let loc in locations) {
            //allowing all locations
            locations[loc].available = true;
        }
        await sheet.item.setFlag("tidy-doll-inventory", "inventoryLocations",
            locations
        )
        inventoryLocations = await sheet.item.getFlag("tidy-doll-inventory", "inventoryLocations");
    }

    // adding the location selector on the sheet;
    if (game.user.isGM || await game.settings.get("tidy-doll-inventory", "playersCanSetSlot")) {
        let htmlElement = await renderTemplate("modules/tidy-doll-inventory/templates/itemLocationSelector.hbs", inventoryLocations);
        let form = html.find("form")
        html.find('.sheet-header').append(htmlElement);

        // flaggin locations on change checkboxes

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
    }


})