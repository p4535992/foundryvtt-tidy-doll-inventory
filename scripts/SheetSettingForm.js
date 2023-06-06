export default class SheetSettingForm extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form', 'doll-inventory-sheet-config'],
            popOut: true,
            template: 'modules/tidy-doll-inventory/templates/default-sheet-config.hbs',
            id: 'my-form-application',
            title: 'My FormApplication',
        });
    }
    getData() {
        return game.settings.get('tidy-doll-inventory', 'defaultSheetConfig');
    }
    activateListeners(html) {
        super.activateListeners(html);
    }
    _updateObject(event, formData) {
        const data = expandObject(formData);
        game.settings.set('tidy-doll-inventory', 'defaultSheetConfig', data);
    }
}