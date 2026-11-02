"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { NumberField } from "@base-ui/react/number-field";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, Minus, Plus, Search } from "lucide-react";
export function CompactSelect({label,value,onChange,items,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;items:{value:string;label:string}[];disabled?:boolean}) {
  const trigger=useRef<HTMLButtonElement>(null),[container,setContainer]=useState<HTMLElement|null>(null);
  useEffect(()=>{setContainer(trigger.current?.closest("dialog")??document.body);},[]);
  return <Select.Root value={value} onValueChange={value=>{if(value!==null)onChange(value);}} items={items} disabled={disabled} modal={false}>
    <Select.Trigger ref={trigger} className="entry-select" aria-label={label}><Select.Value/><Select.Icon><ChevronDown size={16}/></Select.Icon></Select.Trigger>
    <Select.Portal container={container}><Select.Positioner className="entry-positioner" sideOffset={6} alignItemWithTrigger={false}><Select.Popup className="entry-popup"><Select.List>{items.map(item=><Select.Item key={item.value} value={item.value} className="entry-option"><Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator><Check size={15}/></Select.ItemIndicator></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal>
  </Select.Root>;
}
export function ExerciseName({value,onChange,items,recent}:{value:string;onChange:(value:string)=>void;items:string[];recent:Set<string>}) {
  const input=useRef<HTMLInputElement>(null),[container,setContainer]=useState<HTMLElement|null>(null),id=useId();
  useEffect(()=>{setContainer(input.current?.closest("dialog")??document.body);},[]);
  return <div className="exercise-search"><label htmlFor={id}>Exercise</label><Autocomplete.Root items={items} value={value} onValueChange={onChange} openOnInputClick>
    <div className="exercise-search-input"><Search size={17}/><Autocomplete.Input ref={input} id={id} placeholder="Search or name an exercise" maxLength={60} autoComplete="off"/></div>
    <Autocomplete.Portal container={container}><Autocomplete.Positioner className="entry-positioner" sideOffset={6}><Autocomplete.Popup className="entry-popup exercise-popup"><Autocomplete.Empty className="entry-empty">Use your own exercise name</Autocomplete.Empty><Autocomplete.List>{(item:string)=><Autocomplete.Item key={item} value={item} className="entry-option"><span>{item}</span>{recent.has(item.toLowerCase())&&<small>Recent</small>}</Autocomplete.Item>}</Autocomplete.List></Autocomplete.Popup></Autocomplete.Positioner></Autocomplete.Portal>
  </Autocomplete.Root></div>;
}
export function EntryNumber({label,value,onChange,min,max,step=1,unit}:{label:string;value:number|null;onChange:(value:number|null)=>void;min:number;max:number;step?:number;unit?:string}) {
  const id=useId();
  return <NumberField.Root id={id} value={value} onValueChange={onChange} min={min} max={max} step={step} required allowOutOfRange className="entry-number" format={{maximumFractionDigits:2}}>
    <label htmlFor={id}>{label}{unit&&<small>{unit}</small>}</label><NumberField.Group className="entry-number-group"><NumberField.Decrement className="entry-step" aria-label={`Decrease ${label}`}><Minus size={15}/></NumberField.Decrement><NumberField.Input inputMode={step<1?"decimal":"numeric"} aria-label={label}/><NumberField.Increment className="entry-step" aria-label={`Increase ${label}`}><Plus size={15}/></NumberField.Increment></NumberField.Group>
  </NumberField.Root>;
}
