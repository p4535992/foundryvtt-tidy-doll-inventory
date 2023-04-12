import { Tidy5eSheet } from '../../../tidy5e-sheet/scripts/tidy5e-sheet.js'
import { dollConfig } from '../config.js';

export default class DollInventorySheet extends Tidy5eSheet {
    constructor(...args) {
        super(...args);
        this.initInventory();
    }
    get template() {
        if (!game.user.isGM && this.actor.limited && !game.settings.get(CONSTANTS.MODULE_ID, "expandedSheetEnabled"))
            return "modules/tidy5e-sheet/templates/actors/tidy5e-sheet-ltd.html";
        return "modules/tidy-doll-inventory/templates/tidy-doll-sheet.html";
    }


    static get defaultOptions() {

        return mergeObject(super.defaultOptions, {
            classes: ["tidy5e", "sheet", "actor", "character", "doll-inventory-sheet"],
            dragDrop: [
                { dragSelector: ".item-list .item", dropSelector: ".doll-location" }
            ]

        });
    }


    initInventory() {
        this.dollInventory = {
            location: dollConfig.inventory,
            background: this.actor.img
        }

    }

    async getData(options) {
        const context = await super.getData(options);
        context.dollInventory = this.dollInventory;

        return context
    }

    async _onDrop(event) {

        const data = TextEditor.getDragEventData(event);

        if (event.currentTarget.classList.contains("doll-location")) {
            this._onDropDollLocation(event, data)
        }

        super._onDrop(event);



    }

    async _onDropDollLocation(event, data) {
        let dropItem = await Item.implementation.fromDropData(data);
        let availableLocations = await dropItem.getFlag("tidy-doll-inventory", "inventoryLocations")
        let locationID = event.currentTarget.dataset.location;
        if (availableLocations[locationID].available) {
            this.dollInventory.location[locationID].item = dropItem;
            await this.render(true);
        } else {
            return ui.notifications.warn("This item can't be set in this inventory location")
        }

    }
}


