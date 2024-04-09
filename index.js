// parses strings, numbers and words
function parseExpression(program) {
  // remove any whitespace
  program = skipSpace(program);
  let match, expr;
  // construct different data structure depending on parsed program
  if ((match = /^\[/.exec(program))) {
    expr = { type: 'array', elements: parseArray(program) };
  } else if ((match = /^"([^"]*)"/.exec(program))) {
    expr = { type: 'value', value: match[1] };
  } else if ((match = /^\d+\b/.exec(program))) {
    expr = { type: 'value', value: Number(match[0]) };
  } else if ((match = /^[^\s(),#"\[\]]+/.exec(program))) {
    expr = { type: 'word', name: match[0] };
  } else {
    throw new SyntaxError('Unexpected syntax:' + program);
  }
  return parseApply(expr, program.slice(match[0].length));
}
// parses arrays
function parseArray(program) {
  let elements = [];
  // Skip the opening bracket
  program = program.slice(1);
  while (program[0] !== ']') {
    let element = parseExpression(program);
    elements.push(element.expr);
    program = skipSpace(element.rest);

    if (program[0] === ',') {
      program = skipSpace(program.slice(1));
    } else if (program[0] !== ']') {
      throw new SyntaxError("Expected ',' or ']'");
    }
  }

  return elements;
}
// function to cut whitespace off the start of the program string
function skipSpace(string) {
  let first = string.search(/\S/);
  if (first == -1) return '';
  return string.slice(first);
}
// checks whether the expression is an application and it parses a parenthesized list of arguments
function parseApply(expr, program) {
  program = skipSpace(program);
  if (expr.type === 'array') {
    return { expr: expr, rest: program };
  }
  // return the expression it was given if there's no opening parenthesis
  if (program[0] != '(') {
    return { expr: expr, rest: program };
  }
  // create syntax tree object
  program = skipSpace(program.slice(1));
  expr = { type: 'apply', operator: expr, args: [] };
  // recursively call parseExpression to parse each argument until a closing parenthesis is found
  while (program[0] != ')') {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);

    if (program[0] == ',') {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ')') {
      throw new SyntaxError("Expected ',' or ')'");
    }
  }
  return parseApply(expr, program.slice(1));
}
// verifies that it has reached the end of the input string after parsing the expression and gives program's data structure
function parse(program) {
  let { expr, rest } = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    throw new SyntaxError('Unexpected text after program');
  }
  return expr;
}
const specialForms = Object.create(null);
// evaluator
function evaluate(expr, scope) {
  // a value returns itself
  if (expr.type == 'value') {
    return expr.value;
  } else if (expr.type === 'array') {
    return expr.elements.map((element) => evaluate(element, scope));
  } else if (expr.type == 'word') {
    // check if the binding is in the scope and return value
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      throw new ReferenceError(`Undefined binding: ${expr.name}`);
    }
  } else if (expr.type == 'apply') {
    let { operator, args } = expr;
    if (operator.type == 'word' && operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op == 'function') {
        return op(...args.map((arg) => evaluate(arg, scope)));
      } else {
        throw new TypeError('Applying a non-function');
      }
    }
  }
  // array methods support
  if (expr.type === 'array') {
    return expr.elements.map((element) => evaluate(element, scope));
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'length'
  ) {
    return evaluate(expr.args[0], scope).length;
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'push'
  ) {
    let array = evaluate(expr.args[0], scope);
    for (let i = 1; i < expr.args.length; i++) {
      array.push(evaluate(expr.args[i], scope));
    }
    return array;
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'pop'
  ) {
    return evaluate(expr.args[0], scope).pop();
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'shift'
  ) {
    return evaluate(expr.args[0], scope).shift();
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'unshift'
  ) {
    let array = evaluate(expr.args[0], scope);
    for (let i = 1; i < expr.args.length; i++) {
      array.unshift(evaluate(expr.args[i], scope));
    }
    return array;
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'slice'
  ) {
    let array = evaluate(expr.args[0], scope);
    let start = evaluate(expr.args[1], scope);
    let end = evaluate(expr.args[2], scope);
    return array.slice(start, end);
  } else if (
    expr.type === 'apply' &&
    expr.operator.type === 'word' &&
    expr.operator.name === 'splice'
  ) {
    let array = evaluate(expr.args[0], scope);
    let start = evaluate(expr.args[1], scope);
    let deleteCount = evaluate(expr.args[2], scope);
    for (let i = 3; i < expr.args.length; i++) {
      array.splice(start, deleteCount, evaluate(expr.args[i], scope));
    }
    return array;
  }
}
// add "if" syntax
specialForms.if = (args, scope) => {
  if (args.length != 3) {
    throw new SyntaxError('Wrong number of args to if');
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};
// add "while" syntax
specialForms.while = (args, scope) => {
  if (args.length != 2) {
    throw new SyntaxError('Wrong number of args to while');
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }
  return false;
};
// add "do" syntax
specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};
// create bindings
specialForms.def = (args, scope) => {
  if (args.length != 2 || args[0].type != 'word') {
    throw new SyntaxError("Incorrect use of 'def'");
  }
  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;
  return value;
};
// scopes
const topScope = Object.create(null);
topScope.true = true;
topScope.false = false;
// basic arithmetic and comparison operators
for (let op of ['+', '-', '*', '/', '==', '<', '>']) {
  topScope[op] = Function('a, b', `return a ${op} b;`);
}
// add "print" scope
topScope.print = (value) => {
  console.log(value);
  return value;
};
// parse a program and run it in a fresh scope
function run(program) {
  return evaluate(parse(program), Object.create(topScope));
}
// add "function" syntax
specialForms.fun = (args, scope) => {
  if (!args.length) {
    throw new SyntaxError('Functions need a body');
  }
  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map((expr) => {
    if (expr.type != 'word') {
      throw new SyntaxError('Parameter names must be words');
    }
    return expr.name;
  });
  return function () {
    if (arguments.length != params.length) {
      throw new TypeError('Wrong number of arguments');
    }
    let localScope = Object.create(scope);
    for (let i = 0; i < arguments.length; i++) {
      localScope[params[i]] = arguments[i];
    }
    return evaluate(body, localScope);
  };
};
// array operations
specialForms.length = (args, scope) => {
  if (args.length !== 1) {
    throw new SyntaxError('Wrong number of args to length');
  }
  return evaluate(args[0], scope).length;
};
specialForms.push = (args, scope) => {
  if (args.length < 2) {
    throw new SyntaxError('Wrong number of args to push');
  }
  let array = evaluate(args[0], scope);
  for (let i = 1; i < args.length; i++) {
    array.push(evaluate(args[i], scope));
  }
  return array;
};
specialForms.pop = (args, scope) => {
  if (args.length !== 1) {
    throw new SyntaxError('Wrong number of args to pop');
  }
  return evaluate(args[0], scope).pop();
};
specialForms.shift = (args, scope) => {
  if (args.length !== 1) {
    throw new SyntaxError('Wrong number of args to shift');
  }
  return evaluate(args[0], scope).shift();
};
specialForms.unshift = (args, scope) => {
  if (args.length < 2) {
    throw new SyntaxError('Wrong number of args to unshift');
  }
  let array = evaluate(args[0], scope);
  for (let i = 1; i < args.length; i++) {
    array.unshift(evaluate(args[i], scope));
  }
  return array;
};
specialForms.slice = (args, scope) => {
  if (args.length !== 3) {
    throw new SyntaxError('Wrong number of args to slice');
  }
  let array = evaluate(args[0], scope);
  let start = evaluate(args[1], scope);
  let end = evaluate(args[2], scope);
  return array.slice(start, end);
};
specialForms.splice = (args, scope) => {
  if (args.length < 4) {
    throw new SyntaxError('Wrong number of args to splice');
  }
  let array = evaluate(args[0], scope);
  let start = evaluate(args[1], scope);
  let deleteCount = evaluate(args[2], scope);
  for (let i = 3; i < args.length; i++) {
    array.splice(start, deleteCount, evaluate(args[i], scope));
  }
  return array;
};
