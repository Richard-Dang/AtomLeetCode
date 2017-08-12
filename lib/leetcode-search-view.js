'use babel';

import SelectListView from 'atom-select-list';
import fuzzaldrin from 'fuzzaldrin';

export default class LeetcodeSearchView {
    constructor(leetcodeResultView) {
        this.leetcodeResultView = leetcodeResultView;
        this.questionList = [];
        this.selectListView = new SelectListView({
            items: this.questionList,
            emptyMessage: 'No matches found',
            filterKeyForItem: (item) => item.displayName,
            elementForItem: ({
                displayName
            }) => {
                const li = document.createElement('li');
                const div = document.createElement('div');

                li.appendChild(div);

                const span = document.createElement('span');

                const query = this.selectListView.getQuery();
                const matches = fuzzaldrin.match(displayName, query);
                let matchedChars = [];
                let lastIndex = 0;
                for (const matchIndex of matches) {
                    const unmatched = displayName.substring(lastIndex, matchIndex);
                    if (unmatched) {
                        if (matchedChars.length > 0) {
                            const matchSpan = document.createElement('span');
                            matchSpan.textContent = matchedChars.join('');
                            span.appendChild(matchSpan);
                            matchedChars = [];
                        }

                        span.appendChild(document.createTextNode(unmatched));
                    }

                    matchedChars.push(displayName[matchIndex]);
                    lastIndex = matchIndex + 1;
                }

                if (matchedChars.length > 0) {
                    const matchSpan = document.createElement('span');
                    matchSpan.textContent = matchedChars.join('');
                    span.appendChild(matchSpan);
                }

                const unmatched = displayName.substring(lastIndex);
                if (unmatched) {
                    span.appendChild(document.createTextNode(unmatched));
                }

                li.appendChild(span);
                return li;
            },
            didConfirmSelection: (question) => {
                this.hide();
                this.leetcodeResultView.getProblem(null, question.displayName);
            },
            didCancelSelection: () => {
                this.hide();
            }
        });
    }

    async destroy() {
        await this.selectListView.destroy();
    }

    toggle() {
        if (this.panel && this.panel.isVisible()) {
            this.hide();
            return Promise.resolve();
        } else {
            return this.show();
        }
    }

    async show() {
        if (!this.panel) {
            this.panel = atom.workspace.addModalPanel({
                item: this.selectListView
            });
        }

        this.selectListView.refs.queryEditor.selectAll();

        await this.leetcodeResultView.getQuestionList().then((questionList) => {
            this.questionList = questionList.map((e, i) => {
                return {
                    displayName: e
                };
            });
        });

        this.questionList.sort((a, b) => a.displayName.localeCompare(b.displayName));
        await this.selectListView.update({
            items: this.questionList
        });

        this.previouslyFocusedElement = document.activeElement;
        this.panel.show();
        this.selectListView.focus();
    }

    hide() {
        this.panel.hide();
        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus();
            this.previouslyFocusedElement = null;
        }
    }

}
