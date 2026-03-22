INSERT OR IGNORE INTO problems (name, slug, description, starter_code, difficulty, correct_code) VALUES (
  'Matrix Multiplication',
  'matrix-multiplication',
  'Write a function that takes two 2D tensors (matrices) as input and returns their matrix product.

## Example

**Input:**
```python
a = [[1, 2],
     [3, 4]]
b = [[5, 6],
     [7, 8]]
```

**Output:**
```python
[[19, 22],
 [43, 50]]
```

## Constraints
- `a` has shape `(m, n)` and `b` has shape `(n, p)`
- Return a tensor of shape `(m, p)`',
  'import torch

def matrix_multiply(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    pass',
  'Easy',
  'import torch

def matrix_multiply(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    return a @ b'
);

INSERT OR IGNORE INTO test_cases (id, problem_id, input, expected_output) VALUES
(1, 1, 'import torch
from solution import matrix_multiply

a = torch.tensor([[1, 2], [3, 4]])
b = torch.tensor([[5, 6], [7, 8]])
result = matrix_multiply(a, b)
expected = torch.tensor([[19, 22],
        [43, 50]])

assert torch.equal(result, expected), f"Expected {expected}, got {result}"
print("Test 1 passed!")', 'tensor([[19, 22],
        [43, 50]])'),
(2, 1, 'import torch
from solution import matrix_multiply

a = torch.tensor([[1, 0], [0, 1]])
b = torch.tensor([[7, 8], [9, 10]])
result = matrix_multiply(a, b)
expected = torch.tensor([[ 7,  8],
        [ 9, 10]])

assert torch.equal(result, expected), f"Expected {expected}, got {result}"
print("Test 2 passed!")', 'tensor([[ 7,  8],
        [ 9, 10]])'),
(3, 1, 'import torch
from solution import matrix_multiply

a = torch.tensor([[2, 3, 4]])
b = torch.tensor([[1], [2], [3]])
result = matrix_multiply(a, b)
expected = torch.tensor([[20]])

assert torch.equal(result, expected), f"Expected {expected}, got {result}"
print("Test 3 passed!")', 'tensor([[20]])');

INSERT OR IGNORE INTO problems (id, name, slug, description, starter_code, difficulty, correct_code) VALUES (
  2,
  'Linear Layer',
  'linear-layer',
  'Implement a linear (fully connected) layer from scratch. A linear layer computes `y = x @ W^T + b` where `x` is the input, `W` is the weight matrix, and `b` is the bias vector.

## Example

**Input:**
```python
x = [[1.0, 2.0]]
weight = [[0.5, -1.0],
          [1.5,  0.5]]
bias = [0.1, -0.2]
```

**Output:**
```python
[[-1.4, 2.3]]
```

## Details
- `x` has shape `(batch_size, in_features)`
- `weight` has shape `(out_features, in_features)`
- `bias` has shape `(out_features,)`
- Return a tensor of shape `(batch_size, out_features)`
- Do **not** use `torch.nn.Linear` — implement the math yourself',
  'import torch

def linear(x: torch.Tensor, weight: torch.Tensor, bias: torch.Tensor) -> torch.Tensor:
    pass',
  'Medium',
  'import torch

def linear(x: torch.Tensor, weight: torch.Tensor, bias: torch.Tensor) -> torch.Tensor:
    return x @ weight.T + bias'
);

INSERT OR IGNORE INTO test_cases (id, problem_id, input, expected_output) VALUES
(4, 2, 'import torch
from solution import linear

x = torch.tensor([[1.0, 2.0]])
weight = torch.tensor([[0.5, -1.0], [1.5, 0.5]])
bias = torch.tensor([0.1, -0.2])
result = linear(x, weight, bias)
expected = torch.tensor([[-1.4000,  2.3000]])

assert torch.equal(result, expected), f"Expected {expected}, got {result}"
print("Test 1 passed!")', 'tensor([[-1.4000,  2.3000]])'),
(5, 2, 'import torch
from solution import linear

x = torch.tensor([[1.0, 0.0], [0.0, 1.0]])
weight = torch.tensor([[3.0, 4.0], [5.0, 6.0]])
bias = torch.tensor([0.0, 0.0])
result = linear(x, weight, bias)
expected = torch.tensor([[3., 5.],
        [4., 6.]])

assert torch.equal(result, expected), f"Expected {expected}, got {result}"
print("Test 2 passed!")', 'tensor([[3., 5.],
        [4., 6.]])'),
(6, 2, 'import torch
from solution import linear

x = torch.tensor([[1.0, 2.0, 3.0]])
weight = torch.tensor([[1.0, 1.0, 1.0]])
bias = torch.tensor([1.0])
result = linear(x, weight, bias)
expected = torch.tensor([[7.]])

assert torch.equal(result, expected), f"Expected {expected}, got {result}"
print("Test 3 passed!")', 'tensor([[7.]])');
