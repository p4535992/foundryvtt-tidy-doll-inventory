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


    //handelbar helpers

    Handlebars.registerHelper('ifequal', function (a, b, options) {
        if (a == b) { return options.fn(this); }
        return options.inverse(this);
    });

    Handlebars.registerHelper('ifnotequal', function (a, b, options) {
        if (a != b) { return options.fn(this); }
        return options.inverse(this);
    });
    Handlebars.registerHelper('repeat', function (n, block) {
        var accum = '';
        for (var i = 0; i < n; ++i) {
            block.data.index = i;
            block.data.first = i === 0;
            block.data.last = i === (n - 1);
            accum += block.fn(this);
        }
        return accum;
    });

});

Hooks.once('ready', async function () {

});
Hooks.on("renderItemSheet", async function (sheet, html, options) {

    // if items can be droped on dollInventory 
    if (dollConfig.dropableTypes.includes(sheet.item.type)) {

        //getting flags on items for dollInventory 
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
                check.addEventListener('change', async function () {
                    let location = check.dataset.location;
                    inventoryLocations[location].available = check.checked;

                    await sheet.item.setFlag("tidy-doll-inventory", "inventoryLocations",
                        inventoryLocations
                    )
                })
            }
        }
    }
    // creating flags on backpacks
    if (sheet.item.type == "backpack") {
        // getting dollInventory Bags flags
        let bagFlags = await sheet.item.getFlag("tidy-doll-inventory", "bagSlots");

        //if no flag creating it
        if (!bagFlags) {
            let flag = {
                weightRatio: 1,
                currencyWeightRatio: 1,
                containerType: "none",
                containerOptions: {
                    none: "none",
                    bag: "is bag",
                    pouch: "is coin pouch"
                },
                currency: {
                    pp: 0,
                    gp: 10,
                    ep: 0,
                    sp: 0,
                    cp: 0
                },
                computedWeight: 0,
                innerItems: new Array(sheet.item.system.capacity.value),
                available: false,
            }
            await sheet.item.setFlag("tidy-doll-inventory", "bagSlots", flag);
        }

        //creating form for adding inventory slots
        let htmlElement = await renderTemplate("modules/tidy-doll-inventory/templates/bagSetting.hbs", sheet.item);
        let targetEl = html.find(".tab.details")
        targetEl.append(htmlElement)



    }




});
Hooks.on('item-piles-dropItem', async function (sourceActor, tokenSource, itemList, position) {
    fromUuid(tokenSource.tokenUuid).then(async (tokenTarget) => {
        let totalItemList = [];
        //deleting embedded bags item if exist
        for (let item of itemList) {
            let flag = item.flags["tidy-doll-inventory"]?.bagSlots
            if (flag?.containerType == "bag") {
                let itemToAdd = [];
                for (let item of flag.innerItems) {
                    if (item) { itemToAdd.push(item) }
                };
                let idToDelete = itemToAdd.map(i => i._id);
                totalItemList = totalItemList.concat(itemToAdd);
            }
        }
        await game.itempiles.API.transferItems(sourceActor, tokenTarget, totalItemList)

    })

});

Hooks.on('item-piles-createItemPile', async function (...args) {
    console.log(...args)
})
