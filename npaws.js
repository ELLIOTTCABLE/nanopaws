#!/usr/bin/env node
/* Copyright (c) 2009, Elliott Cable
 *
 * Permission to use, copy, modify, and/or distribute this software for any Purpose with or without
 * fee is hereby granted, provided that the above Copyright notice and this permission notice appear
 * in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
 * SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
 * AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
 * NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
 * OF THIS SOFTWARE.
 */

var USE_COLOR      = process.env['USE_COLOR'] === 'false' || true
  , DEBUG = parseInt(process.env['DEBUG'])
  , DEBUG = DEBUG === 0? 0:(DEBUG || 6)

~function(){ var paws = module.exports
 , Thing, Association, Pair, Label, Execution, Alien
 , Instruction, Locals, Juxtapose, Value, World, Staging
 , debug, log, D, P, I, ANSI, getter, noop
   
, API = function(){
   /* Things */
   paws.Thing =
   Thing = function Thing() {
      this._id = Thing.counter++
      this.members = [] }
   Thing.counter = 1
   Thing.Association =
   Association = function Association(to, responsible) {
      this.to = to
      this.responsible = responsible || false }
   Thing.Pair =
   Pair = function Pair(key, value) {
      this.key = key
      this.value = value }
   
   getter(Thing.prototype, 'named', function named() { return this.hasOwnProperty('name') })
   Thing.prototype.name = function name(name) { this.name = name; return this }
   Thing.prototype._name = function _name(name) { this.toString = function toString(){return name}; return this }
   Thing.prototype.toString = function toString() { return this.named? this.name:'' }
   Thing.prototype.inspect = function inspect() { return Thing.inspect(this, false) } 
   Thing.inspect = function inspect(it, bare) { return ANSI.brblack('❲'+it._id+'❳')+(bare? '':it.toString()) }
   
   Thing.prototype.lookup = function lookup(key) {
      for (var i = 0; i < this.members.length; i++) {
         if (this.members[i].to.key.text === key.text) { return this.members[i].to.value } } }
   // Since we're doing a associative-array implementation ...
   Thing.prototype.affix = function affix(key, value, responsible) {
      if (key instanceof Label && !value.named) value.name = key.text
      this.members.push(new Association(new Pair(key, value), responsible)) }
   
   paws.Label =
   Label = function Label(text) { Thing.call(this)
      this.text = text }
 ;(Label.prototype = new Thing).constructor = Label
   Label.prototype.toString = function toString() { return ANSI.cyan("'"+this.text+"'") }
   
   paws.Execution = 
   Execution = function Execution(code) { Thing.call(this)
      if (typeof code === 'function')
         return new Alien(code)
      this.code = code
      this.stack = []
      this.locals = new Thing()._name(ANSI.brblack('locals'))
      this       .affix(new Label('locals'), this.locals)
      this.locals.affix(new Label('locals'), this.locals) }
 ;(Execution.prototype = new Thing).constructor = Execution
   Execution.prototype.toString = function toString() {
      return ANSI.brmagenta(this.named? '`'+this.name+'`' : '`anon`') }
   Execution.prototype.inspect = function() { var rv = new Array
      rv.push(ANSI.brwhite('[') + this.stack.slice(1).reverse().map(function(e){
         return Thing.prototype.inspect.call(e) })
            .join(ANSI.brwhite(', ')) + ANSI.brwhite(']'))
      rv.push(ANSI.brwhite('|') + this.code.map(function(e){
         return e.inspect() })
            .join(ANSI.brwhite(' ')) + ANSI.brwhite('|'))
      return rv.join("\n") }
   
   paws.Alien = 
   Alien = function Alien(code) { Execution.call(this)
      this.native = code
      this.native.wrapper = this
      if (this.native.name) this.name = this.native.name }
 ;(Alien.prototype = new Execution).constructor = Alien
   Alien.prototype.toString = function toString() {
      return ANSI.brmagenta(this.named? '´'+this.name+'´' : '´anon´') }
   Alien.prototype.inspect = Thing.prototype.inspect
   
   /* Bytecode */
   paws.Instruction =
   Instruction = function Instruction() {}
   Instruction.prototype.toString = function toString() { return ANSI.brwhite('I') }
   Instruction.prototype.inspect = function inspect() { return this.toString.apply(this, arguments) }
   
   Instruction.Locals =
   Locals = function Locals() { Instruction.call(this) }
 ;(Locals.prototype = new Instruction).constructor = Locals
   
   Instruction.Me =
   Me = function Me() { Instruction.call(this) }
 ;(Me.prototype = new Instruction).constructor = Me
   Me.prototype.toString = function toString() { return ANSI.brwhite('I:()') }
   
   Instruction.Juxtapose =
   Juxtapose = function Juxtapose() { Instruction.call(this) }
 ;(Juxtapose.prototype = new Instruction).constructor = Juxtapose
   Juxtapose.prototype.toString = function toString() { return ANSI.brwhite('×') }
   
   Instruction.Value
   Value = function Value(contents) { Instruction.call(this)
      this.contents = contents }
 ;(Value.prototype = new Instruction).constructor = Value
   Value.prototype.toString = function toString() {
      return ANSI.brwhite('I:')+this.contents.toString() }
   
   
   /* Parsing */
   paws.parse = function parse(text) { var i = 0
      , character = function character(c){ return text[i] === c && ++i }
      , whitespace = function whitespace(){ while (character(' ')); return true }
      , bracket = function bracket(begin, end) { var result
         return whitespace() && character(begin) && (result = expr()) &&
                whitespace() && character(end) &&
                result }
      
      , paren = function paren() { var result
         if ((result = bracket('(', ')')).length == 1)
            return [new Me()]
         return result }
      , scope = function scope() { var result
         return (result = bracket('{', '}')) && [new Value(new Execution(result))] }
      , label = function label(){ whitespace(); var result = ''
           while ( text[i] && /[^(){} \n;]/.test(text[i]) )
              result = result.concat(text[i++])
           return result && [new Value(new Label(result))] }
      
      , expr = function expr() { var term, result = [new Locals()]
         while (term = paren() || scope() || label())
            result = result.concat(term).concat(new Juxtapose())
         return result }
      , program = function program() { var line, result = expr()
         while ((character('\n') || character(';')) && (line = expr()))
            result = result.concat(line)
         return result }
      
      return program() }
   
   /* Execution */
   Thing.prototype.handler = new Execution(function _thing_(world, left, right, context) {
      D(7)? log('    × thing: ')(P(left), P(right), P(context)) :0
         world.stage(context, left.lookup(right)) })
   Execution.prototype.handler = new Execution(function _execution_(world, left, right, context) { var instruction
      D(7)? log('    × exe:   ')(P(left), P(right), P(context)) :0
      if (left.native)
         return left.native.call(world, right, context)
      if (left.code) {
         left.stack.push(left.stack.length == 0? null : right)
         while (left.code.length > 0) { instruction = left.code.shift()
            D(8)? log('          >> ')(I(instruction), I(left)) :0
            switch (instruction.constructor.name) {
               case 'Locals':
                  left.stack.push(left.locals);
               break; case 'Me':
                  left.stack.push(left);
               break; case 'Value':
                  left.stack.push(instruction.contents);
               break; case 'Juxtapose':
                  var b = left.stack.pop()
                    , a = left.stack.pop()
                  world.stage(a, b, left)
                  return } } } })
   
   /* Staging */
   paws.World =
   World = function() { var that = this
      that.infrastructure = new Thing
    ;(function $$(container){
         Object.getOwnPropertyNames(container).forEach(function(key){
            if (container[key] instanceof Execution)
               return that.infrastructure.affix(new Label(key), container[key])
            return $$(container[key]) }) })(paws.aliens)
      
      that.queue = [] }
   
   World.Staging =
   Staging = function Staging(stagee, value, context) {
      this.stagee = stagee
      this.value = value
      this.context = context }
   Staging.prototype.toString = function toString() {
      return this.stagee.toString()+'×'+this.value.toString() }
   
   World.prototype.stage = function stage(stagee, value, context) {
      this.queue.push(new Staging(stagee, value, context)) }
   World.prototype.result = function result(context, value) { var caller = arguments.callee.caller
      if (value instanceof Execution && arguments.callee.caller.wrapper instanceof Execution
      &&  caller.wrapper.named && !value.named)
          value.name = caller.wrapper.name + '.' // Accrue periods onto the name for each coconsumer
      this.stage(context, value || null) }
   
   World.prototype.next = function next() {
      debug()('['+this.queue.map(function(st){
         return P(st.stagee)+' × '+P(st.value)}).join(', ')+']')
      var staging = this.queue.shift()
      if (staging.stagee.handler.native) {
         staging.stagee.handler.native(this, staging.stagee, staging.value, staging.context) } }
   
   World.prototype.run = function run() {
      while (this.queue.length > 0) {
         this.next() } }
   
   /* Aliens */
   paws.aliens = {
     'whee!': new Execution(function(caller) { this.stage(caller, null) 
         console.log('whee!') })
      
    , print: new Execution(function(caller) {
         this.result(caller, new Execution(function(label) { this.stage(caller, null)
            console.log(label.text) })) })
      
    , inspect: new Execution(function(caller) {
         this.result(caller, new Execution(function(thing) { this.stage(caller, null)
            console.log(thing.toString())
            D(5)? log(3)(thing.inspect()) :0 })) })
      
    , affix: new Execution(function(caller) {
         this.result(caller, new Execution(function(receiver) {
         this.result(caller, new Execution(function(label) {
         this.result(caller, new Execution(function(value) { this.stage(caller, null)
            receiver.affix(label, value) })) })) })) })
      
    , get: new Execution(function(caller) {
         this.result(caller, new Execution(function(receiver) {
         this.result(caller, new Execution(function(number) {
            this.result(caller, receiver.members[parseInt(number.text)].to.value) })) })) })
      
    , lookup: new Execution(function(caller) {
         this.result(caller, new Execution(function(receiver) {
         this.result(caller, new Execution(function(key) {
            this.result(caller, receiver.lookup(key)) })) })) })
      
      // Shouldn't rightfully have a “key” argument, but we're doing ‘pairs’ here
    , set: new Execution(function(caller) {
         this.result(caller, new Execution(function(receiver) {
         this.result(caller, new Execution(function(number) {
         this.result(caller, new Execution(function(key) {
         this.result(caller, new Execution(function(value) { this.stage(caller, null)
            receiver.members[parseInt(number.text)]
               = new Association(new Pair(key, value)) })) })) })) })) })
      
    , execution: {
         unstage: new Execution(function(){})
       , stage: new Execution(function(caller){
            this.result(caller, new Execution(function(receiver) {
            this.result(caller, new Execution(function(value) { this.stage(caller, null)
               this.stage(receiver, value) })) })) })
      } }
} // /API
      
   /* Wrap it all up */
   paws.run = function run(text) { var world = new World 
    , root = new Execution(paws.parse(text))._name(ANSI.brmagenta('root'))
      D(6)? log()(I(root)) :0
      
      root.locals.affix(new Label('infrastructure'), world.infrastructure)
      
      world.stage(root, null)
      world.run()
      
      if (!root.code)
         D(6)? log()(ANSI.bold('-- Complete!')) :0 }
   
   /* elliottcable-Plumbing */
   D = function D(l)  {return DEBUG>=l}
   P = function P(it) {return (log.element||noop).call(log,
      it instanceof Thing? Thing.prototype.inspect.apply(it)
    : (it? it.toString() : ANSI.red('null')) )}
   I = function I(it) { var a, b, tag
      if (!(it instanceof Thing)) return (it?
         (it.inspect? it.inspect:it.toString).call(it) : ANSI.red('null') )
      if (/\n/.test(a = it.inspect()) && log.element) { tag = Thing.inspect(it, true)
         b = log.element(tag + it.toString()); log.extra(tag, a); return b }
         else return a }
   
   paws.debug =
   debug = function debug(level, before){ level = level || 7; before = before || ''
      before = (debug.caller.name || '<anon>')
         +'('+ANSI.brblack('#'+(new Error).stack.split("\n")[2].split(':')[1])+'): '+before
      return DEBUG >= level? log(before):new Function }
   
   debug.log =
   log = function log_start(before){ var indent, elements = new Array
      if (typeof before === 'number') {indent = before; before = ''}
                                 else {before = ''+(before||''); indent = ANSI.strip(before).length+1}
      log.element = function(_){ elements.push([_]); return "\033*"+(elements.length-1) }
      log.extra   = function(tag, _){ elements[elements.length-1].push([tag, _]); return '' }
      return function log_end(text){ var
         output = Array.prototype.slice.call(arguments).join(', ')
            .replace(/\033\*(\d+)/g, function(_, n, offset, output){ return elements[n].shift() })
         
         console.log(ANSI.SGR(40)+before+output+' '+ANSI.SGR(49) )
         elements.forEach(function(e){e.forEach(function(e){
            console.log(ANSI.SGR(40)
            +(e[0]+e[1]).split("\n").map(function(l){
               return new Array(ANSI.strip(e[0]).length+indent).join(' ')+l+' '
            }).join("\n").slice(ANSI.strip(e[0]).length)+' '+ANSI.SGR(49)) })})
         
         delete log.element; delete log.extra }}
   
   debug.ANSI =
   ANSI = new Array
   ANSI[00] = 'reset';   ANSI[01] = 'bold';      ANSI[04] = 'underline'; ANSI[07] = 'negative'
   ANSI[30] = 'black';   ANSI[31] = 'red';       ANSI[32] = 'green';     ANSI[33] = 'yellow'
   ANSI[34] = 'blue';    ANSI[35] = 'magenta';   ANSI[36] = 'cyan';      ANSI[37] = 'white'; ANSI[39] = 'none'
   ANSI[90] = 'brblack'; ANSI[91] = 'brred';     ANSI[92] = 'brgreen';   ANSI[93] = 'bryellow'
   ANSI[94] = 'brblue';  ANSI[95] = 'brmagenta'; ANSI[96] = 'brcyan';    ANSI[97] = 'brwhite'; 
   ANSI.SGR = function SGR(code){ return USE_COLOR? "\033["+code+'m' : '' }
   ANSI.wrap = function wrap_codes(start, end) { return function wrap_text(text){
      return ANSI.SGR(start)+text+ANSI.SGR(end) } }
   ANSI.regex = /\x1B\[([0-9]+(;[0-9]+)*)?m/g
   ANSI.strip = function strip(text){ return text.replace(ANSI.regex,'') }
   ANSI.forEach(function(name, code){ ANSI[name] = ANSI.wrap(code, 39) })
   ANSI.reset = ANSI.SGR(00)
   ANSI.bold = ANSI.wrap(1, 22); ANSI.underline = ANSI.wrap(04, 24); ANSI.underline = ANSI.wrap(07, 07)
   
   getter = function getter(object, property, getter) {
      if (!object.hasOwnProperty(property))
         Object.defineProperty(object, property, { get:getter, enumerable:false }) }
   noop = function noop(arg){ return arg }
   
   /* Testing */
   API()
   paws.SET_DEBUG_LEVEL = function(level){ DEBUG = level }
   
   if (require.main === module)
      switch (process.argv[2]) {
         case '-f': paws.run(require('fs').readFileSync(process.argv[3], 'utf8'))
         case '-e': process.argv[2] = process.argv[3]
           default: paws.run(process.argv[2]) } }()
