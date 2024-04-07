// parses strings, numbers and words
function parseExpression(program) {
  // remove any whitespace
  program = skipSpace(program);

  let match, expr;

  // construct different data structure depending on parsed program
  if ((match = /^"([^"]*)"/.exec(program))) {
    expr = { type: 'value', value: match[1] };
  } else if ((match = /^\d+\b/.exec(program))) {
    expr = { type: 'value', value: Number(match[0]) };
  } else if ((match = /^[^\s(),#"]+/.exec(program))) {
    expr = { type: 'word', name: match[0] };
  } else {
    // throw syntax error if the expression isn't valid
    throw new SyntaxError('Unexpected syntax:' + program);
  }

  return parseApply(expr, program.slice(match[0].length));
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
