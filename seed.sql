INSERT OR IGNORE INTO problems (name, slug, description, starter_code, difficulty) VALUES (
  'Matrix Multiplication',
  'matrix-multiplication',
  'Write a function that takes two 2D tensors (matrices) as input and returns their matrix product.

## Example

**Input:**
```python
A = [[1, 2],
     [3, 4]]
B = [[5, 6],
     [7, 8]]
```

**Output:**
```python
[[19, 22],
 [43, 50]]
```

## Constraints
- `A` has shape `(m, n)` and `B` has shape `(n, p)`
- Return a tensor of shape `(m, p)`',
  'import torch

def matrix_multiply(A: torch.Tensor, B: torch.Tensor) -> torch.Tensor:
    pass',
  'Easy'
);
