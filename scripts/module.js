// SPDX-FileCopyrightText: 2020 Cody Swendrowski
//
// SPDX-License-Identifier: MIT

import DollInventorySheet from "./sheet/DollInventorySheet.mjs";

Hooks.once('init', async function () {




    Actors.registerSheet("dnd5e", DollInventorySheet, {
        types: ["character"],
        makeDefault: true,
    });
});

Hooks.once('ready', async function () {

});
