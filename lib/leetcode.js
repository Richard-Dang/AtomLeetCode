'use babel';

import {
    CompositeDisposable
} from 'atom';

import request from 'request';
import cheerio from 'cheerio';

export default {

    subscriptions: null,
    random_question: null,
    url: null,
    codeText: null,
    commentSymbol: null,
    currentLanguage: null,
    editor: null,
    levelDict: {
        1: 'Easy',
        2: 'Medium',
        3: 'Hard'
    },

    activate() {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'leetcode:easy': () => this.getProblem(1),
            'leetcode:medium': () => this.getProblem(2),
            'leetcode:hard': () => this.getProblem(3),
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    getProblem(difficulty) {
        let self = this;
        const problemList = 'https://leetcode.com/api/problems/all/';
        this.editor = atom.workspace.getActiveTextEditor();

        this.currentLanguage = this.editor.getGrammar().name;

        if (this.editor && this.currentLanguage === 'Null Grammar') {
            atom.notifications.addError('Please select a language first. (Bottom right corner)');
        } else {
            atom.notifications.addInfo(`Grabbing ${this.levelDict[difficulty]} difficulty ${this.currentLanguage} question...`);

            self.download(problemList).then((json) => {
                const questions = JSON.parse(json).stat_status_pairs.filter((e, i) => {
                    return (e.difficulty.level === difficulty && !e.paid_only);
                });

                let question_titles = [];
                for (var x in questions) {
                    question_titles.push({
                        link: questions[x].stat.question__title_slug,
                        title: questions[x].stat.question__title
                    });
                }

                this.random_question = question_titles[Math.floor(Math.random() * question_titles.length)];

                this.url = `https://leetcode.com/problems/${this.random_question.link}`;

                return self.download(this.url);
            }).then((html) => {
                const question = self.scrape(html);

                self.getCode(question);

                atom.notifications.addSuccess(`${this.levelDict[difficulty]} difficulty ${this.currentLanguage} question obtained!`);

                self.populateText(question, difficulty);

            }).catch((err) => {
                atom.notifications.addError(err);
            });
        }
    },

    getCode(question) {
        const commentDict = {
            'JavaScript': ['//', '/*', '*/'],
            'C++': ['//', '/*', '*/'],
            'Java': ['//', '/*', '*/'],
            'C#': ['//', '/*', '*/'],
            'Go': ['//', '/*', '*/'],
            'Python': ['#', '"""', '"""'],
            'Python3': ['#', '"""', '"""'],
            'Ruby': ['//', '=begin', '=end'],
        };

        if (JSON.parse(question.codeArray)) {
            question.codeArray = JSON.parse(question.codeArray);
            for (let x in question.codeArray) {
                if (this.currentLanguage === question.codeArray[x].text) {
                    this.commentSymbol = commentDict[this.currentLanguage];
                    this.codeText = question.codeArray[x].defaultCode;
                    languageFound = true;
                    break;
                }
            }
            if (!languageFound) {
                atom.notifications.addWarning('Language not found!');
            }
        } else {
            atom.notifications.addWarning('Could not parse code text!');
        }
    },

    populateText(question, difficulty) {
        this.editor.insertText(`
${this.commentSymbol[1]}

Question: ${this.random_question.title}
URL: ${this.url}
Difficulty: ${this.levelDict[difficulty]}
Language: ${this.currentLanguage}

=====================================================================================
${question.description}
=====================================================================================

${this.commentSymbol[2]}`);

        this.editor.insertText(`

${this.codeText}

`);
    },

    scrape(html) {
        $ = cheerio.load(html);

        const description = $('#descriptionContent .question-description').text().trim();

        let codeArray = $('script').text().trim().match(/codeDefinition: (.+)/);

        if (codeArray) {
            codeArray = codeArray[1].replace(/'/g, `"`).replace(/(?:\r\n|\r|\n)/g, "").replace(/},],/, '}]').replace(/"""/g, "");
        }

        return {
            description: description,
            codeArray: codeArray,
        };
    },

    download(url) {
        return new Promise((resolve, reject) => {
            request(url, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    resolve(body);
                } else {
                    reject({
                        reason: 'Unable to download'
                    });
                }
            });
        });
    }
};
