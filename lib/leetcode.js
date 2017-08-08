'use babel';

import {
    CompositeDisposable
} from 'atom';

import request from 'request';
import cheerio from 'cheerio';
import async from 'async';

export default {
    subscriptions: null,
    random_question: null,
    url: null,
    commentSymbol: null,
    currentLanguage: null,
    editor: null,
    levelDict: {
        1: 'Easy',
        2: 'Medium',
        3: 'Hard'
    },
    id: null,
    allSolutions: null,
    fileExt: null,
    seperator: Array(60).join('='),
    availableLanguages: [],

    activate() {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'leetcode:easy': () => this.getProblem(1),
            'leetcode:medium': () => this.getProblem(2),
            'leetcode:hard': () => this.getProblem(3),
            'leetcode:solutions': () => this.getSolutions(),
            'leetcode:search': () => this.getProblem(null),
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    getSolutions() {
        if (this.allSolutions === -1) {
            atom.notifications.addWarning('Still trying to find answers...');
        } else if (this.allSolutions === null) {
            atom.notifications.addError('Obtain a question first.');
        } else if (this.allSolutions.length === 0) {
            atom.notifications.addError('Could not find any answers');
        } else if (this.allSolutions.length > 0) {
            atom.workspace.open(`Solutions${this.fileExt}`, {
                split: 'right'
            }).then((editor) => {
                editor.setGrammar(atom.grammars.grammarForScopeName(`source.${this.currentLanguage.toLowerCase()}`));
                for (let x in this.allSolutions) {
                    const title = this.allSolutions[x].title;
                    editor.insertText(`
${this.commentSymbol[0]}${this.seperator}
${this.commentSymbol[0]}Solution [${x}]: ${title}
${this.commentSymbol[0]}${this.seperator}
${this.allSolutions[x].code}

`);
                }
            });
        }
    },

    getProblem(difficulty) {
        this.allSolutions = -1;
        const problemList = 'https://leetcode.com/api/problems/all/';
        this.editor = atom.workspace.getActiveTextEditor();
        this.currentLanguage = this.editor.getGrammar().name;
        this.fileExt = atom.workspace.getActiveTextEditor().getGrammar().scopeName.replace('source', "");
        const search = this.editor.getSelectedText();

        if (this.editor && this.currentLanguage === 'Null Grammar') {
            atom.notifications.addError(`Please select a language first. (Change 'Plain Text' in bottom right corner)`);
        } else {
            if (search) {
                atom.notifications.addInfo(`Attempting to find "${search}" question...`);
            } else if (difficulty) {
                atom.notifications.addInfo(`Grabbing ${this.levelDict[difficulty].toLowerCase()} difficulty ${this.currentLanguage} question...`);
            }

            this.download(problemList).then((json) => {
                    const questions = JSON.parse(json).stat_status_pairs.filter((e, i) => {
                        if (search) {
                            return e.stat.question__title.toLowerCase() === search.toLowerCase();
                        } else if (difficulty) {
                            return (e.difficulty.level === difficulty && !e.paid_only);
                        }
                    });

                    if (questions.length === 0 && search) {
                        atom.notifications.addError(`Could not find "${search}" question...`);
                        return;
                    }

                    let question_titles = [];
                    for (var x in questions) {
                        question_titles.push({
                            link: questions[x].stat.question__title_slug,
                            title: questions[x].stat.question__title
                        });
                    }

                    this.random_question = question_titles[Math.floor(Math.random() * question_titles.length)];
                    this.url = `https://leetcode.com/problems/${this.random_question.link}`;

                    return this.download(this.url);
                }).then((html) => {
                    const question = this.scrape(html);
                    const codeText = this.getCode(question);
                    const discussId = html.match(/discussCategoryId: "(\d+)"/)[1];
                    const discussUrl = `https://discuss.leetcode.com/api/category/${discussId}`;

                    if (codeText) {
                        this.populateText(question, difficulty, codeText);
                        this.download(discussUrl).then((discussData) => {
                            atom.notifications.addInfo('Attempting to obtain answers...');

                            return this.getSolutionData(discussData);
                        }).then((solutions) => {
                            if (solutions.length === 0) {
                                atom.notifications.addWarning('Could not find any answers!');
                            } else {
                                this.allSolutions = solutions;
                                atom.notifications.addSuccess('Finished obtaining answers!');
                            }
                        });
                    } else {
                        atom.notifications.addError(`Please select from the following languages: ${this.availableLanguages}`);
                    }
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    },

    getSolutionData(discussData) {
        return new Promise((resolve, reject) => {
            discussData = JSON.parse(discussData);
            const topics = discussData.topics;
            let solutions = [];
            for (let x in topics) {
                solutions.push({
                    title: topics[x].title,
                    url: `https://discuss.leetcode.com/api/topic/${topics[x].slug}`
                });
            }

            solutions = solutions.filter((e, i) => {
                return e.title.toLowerCase().includes(this.currentLanguage.toLowerCase());
            });

            let codeSolution = [];

            async.eachSeries(solutions, (solution, async_cb) => {
                this.download(solution.url).then((solutionData) => {
                    solutionData = JSON.parse(solutionData);
                    $ = cheerio.load(solutionData.posts[0].content);

                    codeSolution.push({
                        code: this.decodeHtml($('code').text()),
                        title: solution.title
                    });
                    return async_cb();
                });
            }, (err) => {
                if (err) {
                    reject(err);
                }
                resolve(codeSolution);
            });
        });
    },

    decodeHtml(html) {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
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
            'Ruby': ['#', '=begin', '=end'],
        };

        if (JSON.parse(question.codeArray)) {
            question.codeArray = JSON.parse(question.codeArray);
            for (let x in question.codeArray) {
                if (this.availableLanguages.indexOf(question.codeArray[x].text) === -1) {
                    this.availableLanguages.push(question.codeArray[x].text);
                }
                if (this.currentLanguage === question.codeArray[x].text) {
                    this.commentSymbol = commentDict[this.currentLanguage];
                    return question.codeArray[x].defaultCode;
                }
            }
        } else {
            atom.notifications.addWarning('Could not parse code text!');
        }
        return null;

    },

    populateText(question, difficulty, codeText) {
        this.editor.insertText(`${this.commentSymbol[1]}

Question: ${this.random_question.title}
URL: ${this.url}
Difficulty: ${this.levelDict[difficulty]}
Language: ${this.currentLanguage}

${this.seperator}
${question.description}
${this.seperator}

${this.commentSymbol[2]}`);

        this.editor.insertText(`

${codeText}

`);

        let methodCall;
        if (question.input && question.output) {
            if (this.currentLanguage !== 'JavaScript') {
                methodCall = `${codeText.match(/\w+\(/)}${question.input})`;
            } else {
                methodCall = `${codeText.match(/var (.*) =/)[1].replace(/\w+ =/, '')}(${question.input})`;
            }

            this.editor.insertText(`
${this.commentSymbol[0]}Expected output: ${question.output.toUpperCase()}
${methodCall}
`);
        }
    },

    scrape(html) {
        $ = cheerio.load(html);
        const description = $('#descriptionContent .question-description').text().trim();
        let codeArray = $('script').text().trim().match(/codeDefinition: (.+)/);

        if (codeArray) {
            codeArray = codeArray[1].replace(/'/g, `"`).replace(/(?:\r\n|\r|\n)/g, "").replace(/},],/, '}]').replace(/"""/g, "");
        }

        let input = description.match(/Input: (.+)/) || description.match(/Input:\n(.+)/) || description.match(/Given \n(.+)/i);
        let output = description.match(/Output: (.+)/) || description.match(/Output:\n(.+)/) || description.match(/Return \n(.+)/i);

        if (input) {
            input = input[1].replace(/\w = /g, "");
        }

        if (output) {
            output = output[1];
        }

        return {
            description: description,
            codeArray: codeArray,
            input: input,
            output: output,
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
