import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetronomeComponent } from './metronome.component';

describe('MetronomeComponent', () => {
  let component: MetronomeComponent;
  let fixture: ComponentFixture<MetronomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetronomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetronomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
