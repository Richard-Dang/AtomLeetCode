'use babel';

import {
    TextEditor
} from 'atom';

export default class LeetcodeSearchView {

    constructor(serializedState, leetcodeResultView) {
        this.paneItem = null;
        this.question = null;
        this.LeetcodeResultView = leetcodeResultView;
        this.miniEditor = new TextEditor({
            mini: true
        });
        this.miniEditor.element.addEventListener('blur', this.close.bind(this));
        this.miniEditor.setPlaceholderText('Leetcode Question');

        this.message = document.createElement('div');
        this.message.classList.add('message');

        this.element = document.createElement('div');
        this.element.classList.add('search');
        this.element.appendChild(this.miniEditor.element);
        this.element.appendChild(this.message);

        this.panel = atom.workspace.addModalPanel({
            item: this,
            visible: false,
        });

        atom.commands.add(this.miniEditor.element, 'core:confirm', () => {
            this.confirm();
        });
        atom.commands.add(this.miniEditor.element, 'core:cancel', () => {
            this.close();
        });
    }

    confirm() {
        this.question = this.miniEditor.getText();
        this.close();
        this.LeetcodeResultView.getProblem(null, this.question);
    }

    close() {
        if (!this.panel.isVisible()) return;
        this.miniEditor.setText('');
        this.panel.hide();
    }

    open() {
        if (this.panel.isVisible()) return;
        this.panel.show();
        this.message.textContent = "Search Leetcode question";
        this.miniEditor.element.focus();
    }

    serialize() {}

    destroy() {
        this.element.remove();
    }

}
