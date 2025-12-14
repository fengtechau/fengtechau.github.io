import { Component, OnInit } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import * as changeCase from 'change-case';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { AppTitleService } from '../services/app-title.service';
@Component({
    selector: 'app-tools',
    imports: [ReactiveFormsModule, FontAwesomeModule],
    templateUrl: './tools.component.html',
    styleUrl: './tools.component.scss',
    providers: [AppTitleService]
})
export class ToolsComponent implements OnInit {
  faChevronDown = faChevronDown;
  textInput = new FormControl('');
  textOutput = new FormControl('');
  caseOptions = [
    'camel',
    'upper',
    'lower',
    'title',
    'kebab',
    'snake',
    'pascal',
    'dot',
  ];
  caseDescriptions: { [key: string]: string } = {
    camel: 'camelCase',
    upper: 'UPPER CASE',
    lower: 'lower case',
    title: 'Title Case',
    kebab: 'kebab-case',
    snake: 'snake_case',
    pascal: 'PascalCase',
    dot: 'dot.case',
  };
  selectedCase = new FormControl(this.caseOptions[0]);

  constructor(private appTitleService: AppTitleService) {}

  ngOnInit() {
    this.appTitleService.setTitle('Text Convertor');
    const storedCase = localStorage.getItem('selectedCase');
    if (storedCase) {
      this.selectedCase.setValue(storedCase);
    }

    this.selectedCase.valueChanges.subscribe((value) => {
      localStorage.setItem('selectedCase', value ?? 'kebab');
    });
  }

  transformText() {
    let inputText = this.textInput.value ?? '';
    switch (this.selectedCase.value) {
      case 'camel':
        this.textOutput.setValue(changeCase.camelCase(inputText));
        break;
      case 'upper':
        this.textOutput.setValue(inputText.toLocaleUpperCase());
        break;
      case 'lower':
        this.textOutput.setValue(inputText.toLocaleLowerCase());
        break;
      case 'title':
        this.textOutput.setValue(changeCase.capitalCase(inputText));
        break;
      case 'kebab':
        this.textOutput.setValue(changeCase.kebabCase(inputText));
        break;
      case 'snake':
        this.textOutput.setValue(changeCase.snakeCase(inputText));
        break;
      case 'pascal':
        this.textOutput.setValue(changeCase.pascalCase(inputText));
        break;
      case 'dot':
        this.textOutput.setValue(inputText.replace(/ /g, '.'));
        break;
    }
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.textOutput.value ?? '');
  }
}
