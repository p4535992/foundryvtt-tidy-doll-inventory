export const preloadDollInventoryTemplates = async function () {
    // Define template paths to load
    let dollTemplatePaths = [
        // Actor Sheet Partials
        "modules/tidy-doll-inventory/templates/dollItemList.hbs",
        "modules/tidy-doll-inventory/templates/itemCard.hbs",
        "modules/tidy-doll-inventory/templates/dollCurrency.hbs",
    ];

    // Load the template parts
    return loadTemplates(dollTemplatePaths);
};
