'use babel';

import {
    CompositeDisposable
} from 'atom';

import request from 'request';
import cheerio from 'cheerio';

export default {

    subscriptions: null,

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
        let editor, random_question, url;
        let self = this;
        const problemsJSON = 'https://leetcode.com/api/problems/all/';

        const levelDict = {
            1: 'Easy',
            2: 'Medium',
            3: 'Hard'
        };

        if (editor = atom.workspace.getActiveTextEditor()) {
            atom.notifications.addInfo(`Grabbing ${levelDict[difficulty]} difficulty question...`);

            self.download(problemsJSON).then((json) => {
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

                random_question = question_titles[Math.floor(Math.random() * question_titles.length)];

                url = `https://leetcode.com/problems/${random_question.link}`;
                return self.download(url);
            }).then((html) => {
                var question = self.scrape(html);
                atom.notifications.addSuccess(`${levelDict[difficulty]} difficulty question obtained!`);
                editor.insertText(`/*
Question: ${random_question.title}
URL: ${url}
Difficulty: ${levelDict[difficulty]}
Language: Javascript

=====================================================================================
${question.description}
=====================================================================================

*/`);
                editor.insertText(`

${question.codeText}

`);

                if (question.input && question.output && question.codeText) {
                    var checkQuestion = `
//Save this file and run it to check if you passed the test case!
if (${question.codeText.match(/var (.*) =/)[1].replace(/\w+ =/, '')}(${question.input[1]}).toString() === (${question.output[1]}).toString()){
    console.log('You passed the test case!');
}
else {
    console.log('You failed the test case!');
}`;
                    editor.insertText(checkQuestion);
                }
            }).catch((err) => {
                atom.notifications.addError(err);
            });
        }
    },

    scrape(html) {
        $ = cheerio.load(html);

        const description = $('#descriptionContent .question-description').text().trim();
        let codeText = $('script').text().trim().match(/JavaScript', 'defaultCode':(.*)},{'value': 'ruby'/);

        if (codeText) {
            codeText = codeText[1].replace(/\\u000D/g, '').replace(/\\u000A/g, '\n').replace(/\\u003B/g, ';').replace(/\\u003D/g, '=').replace(/'/g, '').replace(/};/, '//Insert code here\n\n};');
        } else {
            atom.notifications.addWarning('Could not find code!');
        }

        const input = description.match(/Input: (.+)/) || description.match(/Input:\n(.+)/) || description.match(/Given \n(.+)/);
        const output = description.match(/Output: (.+)/) || description.match(/Output:\n(.+)/) || description.match(/Return \n(.+)/);

        if (input && output) {
            atom.notifications.addSuccess('Found test example.');
        } else {
            atom.notifications.addWarning('Could not find test example.');
        }

        return {
            description: description,
            codeText: codeText,
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
