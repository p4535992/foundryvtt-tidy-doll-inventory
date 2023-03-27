import { Tidy5eSheet } from '../../../tidy5e-sheet/scripts/tidy5e-sheet.js'

export default class DollInventorySheet extends Tidy5eSheet {
    get template() {
        if (!game.user.isGM && this.actor.limited && !game.settings.get(CONSTANTS.MODULE_ID, "expandedSheetEnabled"))
            return "modules/tidy5e-sheet/templates/actors/tidy5e-sheet-ltd.html";
        return "modules/tidy-doll-inventory/templates/tidy-doll-sheet.html";
    }


    static get defaultOptions() {

        return mergeObject(super.defaultOptions, {
            classes: ["tidy5e", "sheet", "actor", "character", "doll-inventory-sheet"],

        });
    }
}